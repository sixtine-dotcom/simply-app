import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { metaGraphUrl } from "@/lib/content-integrations";

type MediaItem = { url: string; type: "image" | "video" };

const instagramGraphUrl = (path: string) => `https://graph.instagram.com/${process.env.META_GRAPH_VERSION || "v23.0"}/${path.replace(/^\//, "")}`;

async function graphPost(path: string, token: string, values: Record<string, string>, instagram = false) {
  const response = await fetch(instagram ? instagramGraphUrl(path) : metaGraphUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...values, access_token: token }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Meta-publicatie mislukt");
  return data;
}

async function waitUntilReady(containerId: string, token: string) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const url = new URL(instagramGraphUrl(containerId));
    url.searchParams.set("fields", "status_code,status");
    url.searchParams.set("access_token", token);
    const response = await fetch(url);
    const data = await response.json();
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR" || data.status_code === "EXPIRED") throw new Error(data.status || "Meta kon de media niet verwerken");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Meta verwerkt de media nog; probeer over enkele minuten opnieuw");
}

async function publishInstagram(instagramId: string, token: string, media: MediaItem[], caption: string, format: string) {
  if (media.length > 1) {
    const children: string[] = [];
    for (const item of media) {
      const child = await graphPost(`${instagramId}/media`, token, item.type === "video"
        ? { media_type: "VIDEO", video_url: item.url, is_carousel_item: "true" }
        : { image_url: item.url, is_carousel_item: "true" }, true);
      if (item.type === "video") await waitUntilReady(child.id, token);
      children.push(child.id);
    }
    const parent = await graphPost(`${instagramId}/media`, token, { media_type: "CAROUSEL", children: children.join(","), caption }, true);
    const published = await graphPost(`${instagramId}/media_publish`, token, { creation_id: parent.id }, true);
    return published.id as string;
  }

  const item = media[0];
  const values: Record<string, string> = item.type === "video"
    ? { media_type: format === "story" ? "STORIES" : "REELS", video_url: item.url, caption }
    : format === "story"
      ? { media_type: "STORIES", image_url: item.url }
      : { image_url: item.url, caption };
  const container = await graphPost(`${instagramId}/media`, token, values, true);
  if (item.type === "video") await waitUntilReady(container.id, token);
  const published = await graphPost(`${instagramId}/media_publish`, token, { creation_id: container.id }, true);
  return published.id as string;
}

async function publishFacebook(pageId: string, token: string, media: MediaItem[], caption: string) {
  if (media.length > 1 && media.every((item) => item.type === "image")) {
    const photos = [];
    for (const item of media) photos.push(await graphPost(`${pageId}/photos`, token, { url: item.url, published: "false" }));
    const result = await graphPost(`${pageId}/feed`, token, { message: caption, attached_media: JSON.stringify(photos.map((photo) => ({ media_fbid: photo.id }))) });
    return result.id as string;
  }
  const item = media[0];
  const result = item.type === "video"
    ? await graphPost(`${pageId}/videos`, token, { file_url: item.url, description: caption })
    : await graphPost(`${pageId}/photos`, token, { url: item.url, caption, published: "true" });
  return result.id as string;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const body = await request.json();
  const media = (Array.isArray(body.media) ? body.media : []).filter((item: MediaItem) => item?.url?.startsWith("https://") && ["image", "video"].includes(item.type));
  if (!media.length) return NextResponse.json({ error: "Meta heeft minstens één publiek bereikbare foto of video nodig" }, { status: 400 });
  const platforms = Array.isArray(body.platforms) ? body.platforms : ["instagram"];
  const [facebookConnection, instagramConnection] = await Promise.all([
    platforms.includes("facebook") ? db.integrationConnection.findUnique({ where: { userId_provider: { userId: user.id, provider: "meta" } } }) : null,
    platforms.includes("instagram") ? db.integrationConnection.findUnique({ where: { userId_provider: { userId: user.id, provider: "instagram" } } }) : null,
  ]);
  try {
    const result: { instagramId?: string; facebookId?: string } = {};
    if (platforms.includes("instagram")) {
      if (!instagramConnection) throw new Error("Koppel eerst je Instagram-account");
      const instagramMetadata = (instagramConnection.metadata || {}) as { instagramId?: string };
      const instagramId = instagramMetadata.instagramId || instagramConnection.providerAccountId;
      if (!instagramId) throw new Error("Instagram-accountnummer ontbreekt; koppel Instagram opnieuw");
      result.instagramId = await publishInstagram(instagramId, instagramConnection.accessToken, media, body.caption || "", body.format || "post");
    }
    if (platforms.includes("facebook")) {
      if (!facebookConnection) throw new Error("Koppel eerst je Facebookpagina");
      const facebookMetadata = (facebookConnection.metadata || {}) as { pageId?: string };
      const pageId = facebookMetadata.pageId || facebookConnection.providerAccountId;
      if (!pageId) throw new Error("Facebook-paginanummer ontbreekt; koppel Facebook opnieuw");
      result.facebookId = await publishFacebook(pageId, facebookConnection.accessToken, media, body.caption || "");
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Meta publish failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Publiceren mislukt" }, { status: 502 });
  }
}
