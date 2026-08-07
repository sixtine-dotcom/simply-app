import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { integrationRedirectUri, metaGraphUrl, verifyIntegrationState } from "@/lib/content-integrations";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const code = request.nextUrl.searchParams.get("code");
  const parsed = verifyIntegrationState(request.nextUrl.searchParams.get("state") || "", "meta");
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!user || !code || !parsed || parsed.userId !== user.id || !appId || !appSecret) return NextResponse.redirect(new URL("/admin/content?meta=failed", request.url));
  try {
    const shortUrl = new URL(metaGraphUrl("oauth/access_token"));
    shortUrl.searchParams.set("client_id", appId);
    shortUrl.searchParams.set("client_secret", appSecret);
    shortUrl.searchParams.set("redirect_uri", integrationRedirectUri("meta"));
    shortUrl.searchParams.set("code", code);
    const shortResponse = await fetch(shortUrl);
    if (!shortResponse.ok) throw new Error(await shortResponse.text());
    const shortToken = await shortResponse.json();

    const longUrl = new URL(metaGraphUrl("oauth/access_token"));
    longUrl.searchParams.set("grant_type", "fb_exchange_token");
    longUrl.searchParams.set("client_id", appId);
    longUrl.searchParams.set("client_secret", appSecret);
    longUrl.searchParams.set("fb_exchange_token", shortToken.access_token);
    const longResponse = await fetch(longUrl);
    const token = longResponse.ok ? await longResponse.json() : shortToken;

    const accountsUrl = new URL(metaGraphUrl("me/accounts"));
    accountsUrl.searchParams.set("fields", "id,name,access_token");
    accountsUrl.searchParams.set("access_token", token.access_token);
    const accountsResponse = await fetch(accountsUrl);
    if (!accountsResponse.ok) throw new Error(await accountsResponse.text());
    const accounts = (await accountsResponse.json()).data || [];
    const linked = accounts[0];
    if (!linked) throw new Error("Geen Facebookpagina gevonden");
    await db.integrationConnection.upsert({
      where: { userId_provider: { userId: user.id, provider: "meta" } },
      create: {
        userId: user.id,
        provider: "meta",
        providerAccountId: linked.id,
        accountName: linked.name,
        accessToken: linked.access_token || token.access_token,
        expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
        scope: "pages_show_list pages_read_engagement pages_manage_posts",
        metadata: { pageId: linked.id, pageName: linked.name, accounts },
      },
      update: {
        providerAccountId: linked.id,
        accountName: linked.name,
        accessToken: linked.access_token || token.access_token,
        expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
        scope: "pages_show_list pages_read_engagement pages_manage_posts",
        metadata: { pageId: linked.id, pageName: linked.name, accounts },
      },
    });
    return NextResponse.redirect(new URL("/admin/content?meta=connected", request.url));
  } catch (error) {
    console.error("Meta OAuth callback failed", error);
    return NextResponse.redirect(new URL("/admin/content?meta=failed", request.url));
  }
}
