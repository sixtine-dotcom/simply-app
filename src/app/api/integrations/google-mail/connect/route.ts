import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { googleMailAuthorizationUrl } from "@/lib/google-mail";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) return NextResponse.redirect(new URL("/login", request.url));
  const state = Buffer.from(JSON.stringify({ userId: user.id, at: Date.now() })).toString("base64url");
  try { return NextResponse.redirect(googleMailAuthorizationUrl(state)); }
  catch { return NextResponse.redirect(new URL("/admin/email-campaigns?google=not-configured", request.url)); }
}
