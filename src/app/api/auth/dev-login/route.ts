import { NextRequest, NextResponse } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  if (process.env.NODE_ENV !== "development" || !["localhost", "127.0.0.1"].includes(hostname)) {
    return NextResponse.json({ error: "Niet beschikbaar" }, { status: 404 });
  }

  const email = (process.env.DEV_ADMIN_EMAIL || "sixtine@simplyinbalance.com").toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) {
    return NextResponse.json({ error: `Geen lokale beheerder gevonden voor ${email}` }, { status: 404 });
  }

  const token = await createSession(
    user.id,
    request.headers.get("user-agent") || undefined,
    request.headers.get("x-forwarded-for") || undefined
  );
  await setSessionCookie(token);
  return NextResponse.redirect(new URL("/admin/content", request.url));
}
