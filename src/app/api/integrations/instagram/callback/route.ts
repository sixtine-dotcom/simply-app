import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrationRedirectUri, verifyIntegrationState } from "@/lib/content-integrations";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const code = request.nextUrl.searchParams.get("code")?.replace(/#_$/, "");
  const parsed = verifyIntegrationState(request.nextUrl.searchParams.get("state") || "", "instagram");
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!user || !code || !parsed || parsed.userId !== user.id || !appId || !appSecret) return NextResponse.redirect(new URL("/admin/content?instagram=failed", request.url));
  try {
    const shortResponse = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: appId, client_secret: appSecret, grant_type: "authorization_code", redirect_uri: integrationRedirectUri("instagram"), code }),
    });
    if (!shortResponse.ok) throw new Error(await shortResponse.text());
    const shortToken = await shortResponse.json();
    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", appSecret);
    longUrl.searchParams.set("access_token", shortToken.access_token);
    const longResponse = await fetch(longUrl);
    const token = longResponse.ok ? await longResponse.json() : shortToken;
    const version = process.env.META_GRAPH_VERSION || "v23.0";
    const profileUrl = new URL(`https://graph.instagram.com/${version}/me`);
    profileUrl.searchParams.set("fields", "user_id,username,name,profile_picture_url");
    profileUrl.searchParams.set("access_token", token.access_token);
    const profileResponse = await fetch(profileUrl);
    if (!profileResponse.ok) throw new Error(await profileResponse.text());
    const profile = await profileResponse.json();
    const instagramId = String(profile.user_id || profile.id || shortToken.user_id);
    await db.integrationConnection.upsert({
      where: { userId_provider: { userId: user.id, provider: "instagram" } },
      create: { userId: user.id, provider: "instagram", providerAccountId: instagramId, accountName: profile.username ? `@${profile.username}` : profile.name || "Instagram", accessToken: token.access_token, expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null, scope: "instagram_business_basic instagram_business_content_publish", metadata: { instagramId, username: profile.username } },
      update: { providerAccountId: instagramId, accountName: profile.username ? `@${profile.username}` : profile.name || "Instagram", accessToken: token.access_token, expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null, scope: "instagram_business_basic instagram_business_content_publish", metadata: { instagramId, username: profile.username } },
    });
    return NextResponse.redirect(new URL("/admin/content?instagram=connected", request.url));
  } catch (error) {
    console.error("Instagram OAuth callback failed", error);
    return NextResponse.redirect(new URL("/admin/content?instagram=failed", request.url));
  }
}
