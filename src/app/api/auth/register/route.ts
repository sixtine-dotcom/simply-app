import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createRegistrationToken } from "@/lib/auth";
import { sendRegistrationEmail } from "@/lib/email";

const registerSchema = z.object({
  email: z.string().email("Ongeldig email adres"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    const email = data.email.toLowerCase();

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
    const token = await createRegistrationToken(email);

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
