import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { integrationRedirectUri, signIntegrationState } from "@/lib/content-integrations";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) return NextResponse.redirect(new URL("/login", request.url));
  const appId = process.env.META_APP_ID;
  if (!appId) return NextResponse.redirect(new URL("/admin/content?meta=not-configured", request.url));
  const state = signIntegrationState({ userId: user.id, provider: "meta", returnTo: "/admin/content" });
  const version = process.env.META_GRAPH_VERSION || "v23.0";
  const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", integrationRedirectUri("meta"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "pages_show_list,pages_read_engagement,pages_manage_posts");
  return NextResponse.redirect(url);
}
