import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createMagicLink } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

/**
 * Stuur een test-welkomstmail (zoals na cursusaankoop) naar jezelf.
 * Alleen voor admins. POST met { "email": "jouw@email.nl" }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Alleen voor admins" }, { status: 403 });
    }

    const body = await request.json();
    const email = (body.email || user.email || "").toString().trim();
    if (!email) {
      return NextResponse.json(
        { error: "Geef een email op: { \"email\": \"jouw@email.nl\" }" },
        { status: 400 }
      );
    }

    const token = await createMagicLink(email);
    const result = await sendWelcomeEmail(email, "Test", token, {
      courseTitles: ["Simply Challenge"],
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Kon email niet versturen. Controleer RESEND_API_KEY in .env.local.",
          detail: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Testmail verstuurd naar ${email}. Check je inbox (en spam).`,
    });
  } catch (e) {
    console.error("Test email error:", e);
    return NextResponse.json(
      { error: "Er is iets misgegaan." },
      { status: 500 }
    );
  }
}
