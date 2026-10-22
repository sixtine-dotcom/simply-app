import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { integrationRedirectUri, signIntegrationState } from "@/lib/content-integrations";
import { TIKTOK_SCOPES } from "@/lib/tiktok";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) return NextResponse.redirect(new URL("/login", request.url));
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey || !process.env.TIKTOK_CLIENT_SECRET) return NextResponse.redirect(new URL("/admin/content?tiktok=not-configured", request.url));
  const state = signIntegrationState({ userId: user.id, provider: "tiktok", returnTo: "/admin/content" });
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", clientKey);
  url.searchParams.set("scope", TIKTOK_SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", integrationRedirectUri("tiktok"));
  url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}
