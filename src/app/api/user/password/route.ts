import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { takeAuthAttempt } from "@/lib/auth-rate-limit";
const schema = z.object({ password: z.string().min(12).max(256), currentPassword: z.string().max(256).optional() });
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log opnieuw in." }, { status: 401 });
    if (user.impersonation) return NextResponse.json({ error: "Een wachtwoord kan alleen vanuit het eigen account worden ingesteld." }, { status: 403 });
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 403 });
    if (!await takeAuthAttempt("password-change", user.id, 8)) return NextResponse.json({ error: "Probeer het over 15 minuten opnieuw." }, { status: 429 });
    const data = schema.safeParse(await request.json());
    if (!data.success) return NextResponse.json({ error: "Gebruik een wachtwoord van 12 tot 256 tekens." }, { status: 400 });
    const token = (await cookies()).get("simply_session")?.value;
    const sessionHash = token ? createHash("sha256").update(token).digest("hex") : "";
    const session = sessionHash ? await db.authSession.findUnique({ where: { token: sessionHash } }) : null;
    const recent = session?.userId === user.id && session.createdAt.getTime() > Date.now() - 15 * 60_000;
    if (!recent && !(data.data.currentPassword && await verifyPassword(data.data.currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Log eerst opnieuw in via een inloglink. Stel daarna binnen 15 minuten je wachtwoord in." }, { status: 403 });
    }
    const passwordHash = await hashPassword(data.data.password);
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { passwordHash } }),
      db.authSession.deleteMany({ where: { userId: user.id, token: { not: sessionHash } } }),
      db.verificationToken.deleteMany({ where: { email: user.email, type: { in: ["magic_link", "password_reset"] } } }),
    ]);
    await createAuditLog("auth.password_changed", user.id, undefined, undefined, user.tenantId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Het wachtwoord kon niet worden opgeslagen. Probeer het opnieuw." }, { status: 500 });
  }
}
