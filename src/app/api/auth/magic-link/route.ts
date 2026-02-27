import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createMagicLink, createAuditLog } from "@/lib/auth";
import { sendMagicLinkEmail, sendWelcomeEmail } from "@/lib/email";

const requestSchema = z.object({
  email: z.string().email("Ongeldig email adres"),
  next: z.string().optional(), // na inloggen doorsturen, bijv. /admin
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, next: nextPath } = requestSchema.parse(body);

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // For security, don't reveal if user exists or not
      // But we also can't send a magic link to non-existent users
      return NextResponse.json(
        { error: "Als dit email adres bij ons bekend is, ontvang je een inloglink." },
        { status: 200 }
      );
    }

    // Create magic link token
    const token = await createMagicLink(email.toLowerCase());

    // Send email
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const nextParam = nextPath ? `&next=${encodeURIComponent(nextPath)}` : "";
    const magicLinkUrl = `${appUrl}/verify?token=${token}${nextParam}`;

    const emailResult = user.lastLoginAt
      ? await sendMagicLinkEmail(email, token, nextPath)
      : await sendWelcomeEmail(email, user.firstName, token, { next: nextPath });

    if (!emailResult.success) {
      // In development: return link so you can still log in (e.g. when Resend not configured)
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({
          success: true,
          devMagicLink: magicLinkUrl,
        } as { success: true; devMagicLink: string });
      }
      return NextResponse.json(
        { error: "Kon email niet versturen. Probeer het later opnieuw." },
        { status: 500 }
      );
    }

    // Audit log
    await createAuditLog(
      "auth.magic_link_sent",
      user.id,
      { email },
      request.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      devMagicLink: process.env.NODE_ENV === "development" ? magicLinkUrl : undefined,
    } as { success: true; devMagicLink?: string });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Magic link error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
