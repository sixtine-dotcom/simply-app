import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createRegistrationToken } from "@/lib/auth";
import { sendRegistrationEmail } from "@/lib/email";
import { isLaunchLockEnabled, launchLockMessage } from "@/lib/launch-lock";

const registerSchema = z.object({
  email: z.string().email("Ongeldig email adres"),
  accountType: z.enum(["client", "tenant_admin"]).default("client"),
  tenantName: z.string().trim().max(120).optional(),
  tenantSlug: z
    .string()
    .trim()
    .max(100)
    .optional(),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    if (isLaunchLockEnabled()) {
      return NextResponse.json({ error: launchLockMessage() }, { status: 403 });
    }

    const body = await request.json();
    const data = registerSchema.parse(body);

    const email = data.email.toLowerCase();
    const normalizedSlug =
      data.accountType === "tenant_admin" ? slugify(data.tenantSlug || "") : "";

    if (data.accountType === "tenant_admin") {
      if (!data.tenantName?.trim()) {
        return NextResponse.json({ error: "Platformnaam is verplicht." }, { status: 400 });
      }
      if (!normalizedSlug) {
        return NextResponse.json({ error: "Platform slug is verplicht." }, { status: 400 });
      }

      const existingTenant = await db.tenant.findUnique({
        where: { slug: normalizedSlug },
        select: { id: true },
      });

      if (existingTenant) {
        return NextResponse.json(
          { error: "Deze platform slug is al in gebruik." },
          { status: 400 }
        );
      }
    }

    // Check if user already exists → redirect to login
    const existing = await db.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Dit email adres is al in gebruik. Log in met je bestaande account.", existingAccount: true },
        { status: 400 }
      );
    }

    // Create registration token (7 days valid)
    const token = await createRegistrationToken(
      email,
      data.accountType === "tenant_admin"
        ? {
            accountType: "tenant_admin",
            tenantName: data.tenantName?.trim(),
            tenantSlug: normalizedSlug,
          }
        : { accountType: "client" }
    );

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const completeLink = `${appUrl}/register/complete?token=${token}`;

    // Send registration email (don't let email failure break the flow)
    let emailResult = { success: false as boolean };
    try {
      emailResult = await sendRegistrationEmail(email, token);
    } catch (e) {
      console.error("Register email error:", e);
    }

    if (!emailResult.success) {
      return NextResponse.json({
        success: true,
        message: "Link kon niet per email worden verstuurd.",
        devMagicLink: process.env.NODE_ENV === "development" ? completeLink : undefined,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Check je inbox voor de link om je account te voltooien.",
      devMagicLink: process.env.NODE_ENV === "development" ? completeLink : undefined,
      accountType: data.accountType,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Register error:", error);
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Er is iets misgegaan";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
