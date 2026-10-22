import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyIntegrationState } from "@/lib/content-integrations";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state") || "";
  const parsed = verifyIntegrationState(state, "canva");
  const verifier = request.cookies.get("canva_pkce")?.value;
  if (!user || !code || !parsed || parsed.userId !== user.id || !verifier) return NextResponse.redirect(new URL("/admin/content?canva=failed", request.url));
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.redirect(new URL("/admin/content?canva=not-configured", request.url));
  try {
    const tokenResponse = await fetch("https://api.canva.com/rest/v1/oauth/token", {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: `${request.nextUrl.origin}/api/integrations/canva/callback` }),
    });
    if (!tokenResponse.ok) throw new Error(await tokenResponse.text());
    const token = await tokenResponse.json();
    await db.integrationConnection.upsert({
      where: { userId_provider: { userId: user.id, provider: "canva" } },
      create: { userId: user.id, provider: "canva", accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null, scope: token.scope },
      update: { accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null, scope: token.scope },
    });
    const response = NextResponse.redirect(new URL("/admin/content/carousels?canva=connected", request.url));
    response.cookies.delete("canva_pkce");
    return response;
  } catch (error) {
    console.error("Canva OAuth callback failed", error);
    return NextResponse.redirect(new URL("/admin/content?canva=failed", request.url));
  }
}
