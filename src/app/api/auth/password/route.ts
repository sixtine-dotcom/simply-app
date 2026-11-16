import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, setSessionCookie, createAuditLog } from "@/lib/auth";
import { hasProvisionedAccountAccess } from "@/lib/account-access";
import { verifyPassword } from "@/lib/passwords";
import { takeAuthAttempt } from "@/lib/auth-rate-limit";
import { isEmailAllowedDuringLaunch } from "@/lib/launch-lock";
const schema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(256) });

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Vul je e-mailadres en wachtwoord in." }, { status: 400 });
    const email = parsed.data.email.toLowerCase();
    const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const ipAllowed = await takeAuthAttempt("password-ip", ip, 40);
    const emailAllowed = ipAllowed && await takeAuthAttempt("password-email", email, 8);
    if (!emailAllowed || !ipAllowed) return NextResponse.json({ error: "Te veel pogingen. Probeer het over 15 minuten opnieuw of gebruik een inloglink." }, { status: 429, headers: { "Retry-After": "900" } });
    const user = await db.user.findUnique({ where: { email } });
    const valid = await verifyPassword(parsed.data.password, user?.passwordHash);
    if (!valid || !user || !isEmailAllowedDuringLaunch(email) || !await hasProvisionedAccountAccess(user)) {
      return NextResponse.json({ error: "Inloggen lukt niet met deze gegevens. Je kunt ook een inloglink aanvragen." }, { status: 401 });
    }
    const session = await createSession(user.id, request.headers.get("user-agent") || undefined, ip);
    await setSessionCookie(session);
    await createAuditLog("auth.login", user.id, { method: "password" }, ip, user.tenantId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Inloggen lukt momenteel niet. Probeer het opnieuw." }, { status: 500 });
  }
}
