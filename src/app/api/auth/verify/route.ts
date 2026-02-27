import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyMagicLink, createSession, setSessionCookie, createAuditLog } from "@/lib/auth";

const requestSchema = z.object({
  token: z.string().min(1, "Token is verplicht"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = requestSchema.parse(body);

    // Verify the magic link token
    const result = await verifyMagicLink(token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Ongeldige of verlopen link" },
        { status: 400 }
      );
    }

    if (!result.user) {
      return NextResponse.json(
        { error: "Gebruiker niet gevonden" },
        { status: 404 }
      );
    }

    // Create session
    const sessionToken = await createSession(
      result.user.id,
      request.headers.get("user-agent") || undefined,
      request.headers.get("x-forwarded-for") || undefined
    );

    // Set session cookie
    await setSessionCookie(sessionToken);

    // Audit log
    await createAuditLog(
      "auth.login",
      result.user.id,
      { method: "magic_link" },
      request.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Verify error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
