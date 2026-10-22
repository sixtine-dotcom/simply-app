import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrationRedirectUri, verifyIntegrationState } from "@/lib/content-integrations";
import { exchangeTikTokCode, fetchTikTokDisplayName, tiktokConfigured } from "@/lib/tiktok";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const code = request.nextUrl.searchParams.get("code");
  const parsed = verifyIntegrationState(request.nextUrl.searchParams.get("state") || "", "tiktok");
  if (!user || !code || !parsed || parsed.userId !== user.id || !tiktokConfigured()) return NextResponse.redirect(new URL("/admin/content?tiktok=failed", request.url));
  try {
    const token = await exchangeTikTokCode(code, integrationRedirectUri("tiktok"));
    const displayName = await fetchTikTokDisplayName(token.access_token);
    const values = {
      providerAccountId: token.open_id || null,
      accountName: displayName || "TikTok",
      accessToken: token.access_token,
      refreshToken: token.refresh_token || null,
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      scope: token.scope || null,
      metadata: { openId: token.open_id, displayName },
    };
    await db.integrationConnection.upsert({
      where: { userId_provider: { userId: user.id, provider: "tiktok" } },
      create: { userId: user.id, provider: "tiktok", ...values },
      update: values,
    });
    return NextResponse.redirect(new URL("/admin/content?tiktok=connected", request.url));
  } catch (error) {
    console.error("TikTok OAuth callback failed", error);
    return NextResponse.redirect(new URL("/admin/content?tiktok=failed", request.url));
  }
}
