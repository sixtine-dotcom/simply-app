import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  verifyRegistrationToken,
  completeRegistration,
  createSession,
  setSessionCookie,
  createAuditLog,
} from "@/lib/auth";

const completeSchema = z.object({
  token: z.string().min(1, "Token is verplicht"),
  firstName: z.string().min(1, "Voornaam is verplicht"),
  lastName: z.string().min(1, "Achternaam is verplicht"),
  phone: z.string().min(1, "Telefoonnummer is verplicht – zo kunnen we je via WhatsApp bereiken"),
  bio: z.string().max(500).nullable().optional(),
});

/** GET: verify registration token and return email (for showing on complete form) */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Geen token" }, { status: 400 });
  }

  const result = await verifyRegistrationToken(token);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ email: result.email });
}

/** POST: complete registration with name, create user + session, set cookie */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = completeSchema.parse(body);

    const result = await completeRegistration(
      data.token,
      data.firstName.trim(),
      data.lastName.trim(),
      data.phone.trim(),
      data.bio ?? null
    );

    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: result.error || "Registratie mislukt" },
        { status: 400 }
      );
    }

    const sessionToken = await createSession(
      result.user.id,
      request.headers.get("user-agent") || undefined,
      request.headers.get("x-forwarded-for") || undefined
    );

    await setSessionCookie(sessionToken);

    await createAuditLog(
      "user.created",
      result.user.id,
      { email: result.user.email, source: "register_complete" },
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
    console.error("Register complete error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
