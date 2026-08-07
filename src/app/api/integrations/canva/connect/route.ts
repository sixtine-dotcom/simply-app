import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPkce, integrationRedirectUri, signIntegrationState } from "@/lib/content-integrations";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) return NextResponse.redirect(new URL("/login", request.url));
  const clientId = process.env.CANVA_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL("/admin/content?canva=not-configured", request.url));
  const { verifier, challenge } = createPkce();
  const state = signIntegrationState({ userId: user.id, provider: "canva", returnTo: "/admin/content" });
  const url = new URL("https://www.canva.com/api/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", integrationRedirectUri("canva"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile design:meta:read design:content:read");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "s256");
  const response = NextResponse.redirect(url);
  response.cookies.set("canva_pkce", verifier, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 900, path: "/" });
  return response;
}
