import { db } from "@/lib/db";

// Publishing reels through the Instagram API (Instagram Login, instagram_business_content_publish).
// Instagram has no native scheduling in the API, so the app keeps the schedule and publishes at the
// chosen time in two steps: create a media container, then publish it once Instagram has processed it.

const graphUrl = (path: string) =>
  `https://graph.instagram.com/${process.env.META_GRAPH_VERSION || "v23.0"}/${path.replace(/^\//, "")}`;

async function graphPost(path: string, token: string, values: Record<string, string>) {
  const response = await fetch(graphUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...values, access_token: token }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Instagram-publicatie mislukt");
  return data;
}

/** The tenant admin's Instagram connection; refreshes the long-lived token when it is about to expire. */
export async function getInstagramConnection(tenantId: string | null) {
  const connection = await db.integrationConnection.findFirst({
    where: { provider: "instagram", user: { tenantId, role: { in: ["ADMIN", "SUPERADMIN"] } } },
    orderBy: { updatedAt: "desc" },
  });
  if (!connection) throw new Error("Koppel eerst je Instagram-account (Contentplanner → Instagram koppelen)");
  const instagramId = (connection.metadata as { instagramId?: string } | null)?.instagramId || connection.providerAccountId;
  if (!instagramId) throw new Error("Instagram-accountnummer ontbreekt; koppel Instagram opnieuw");

  let token = connection.accessToken;
  const weekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
  if (connection.expiresAt && connection.expiresAt.getTime() < weekFromNow) {
    const url = new URL("https://graph.instagram.com/refresh_access_token");
    url.searchParams.set("grant_type", "ig_refresh_token");
    url.searchParams.set("access_token", token);
    const refreshed = await fetch(url).then((r) => r.json()).catch(() => null);
    if (refreshed?.access_token) {
      token = refreshed.access_token;
      await db.integrationConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: token,
          expiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : connection.expiresAt,
        },
      });
    }
  }
  return { instagramId, token, accountName: connection.accountName };
}

export async function createReelContainer(instagramId: string, token: string, videoUrl: string, caption: string, thumbnailSec?: number | null) {
  const container = await graphPost(`${instagramId}/media`, token, {
    media_type: "REELS",
    video_url: videoUrl,
    caption,
    share_to_feed: "true",
    // Cover image: this moment of the video (milliseconds).
    ...(thumbnailSec != null ? { thumb_offset: String(Math.max(0, Math.round(thumbnailSec * 1000))) } : {}),
  });
  return container.id as string;
}

export async function reelContainerStatus(containerId: string, token: string) {
  const url = new URL(graphUrl(containerId));
  url.searchParams.set("fields", "status_code,status");
  url.searchParams.set("access_token", token);
  const data = await fetch(url).then((r) => r.json());
  return { code: data.status_code as string | undefined, message: data.status as string | undefined };
}

export async function publishReelContainer(instagramId: string, token: string, containerId: string) {
  const published = await graphPost(`${instagramId}/media_publish`, token, { creation_id: containerId });
  return published.id as string;
}

/** Whether a post still exists on Instagram (false once it was deleted from the profile; null = unknown). */
export async function instagramPostExists(mediaId: string, token: string): Promise<boolean | null> {
  const url = new URL(graphUrl(mediaId));
  url.searchParams.set("fields", "id");
  url.searchParams.set("access_token", token);
  const response = await fetch(url).catch(() => null);
  if (!response) return null;
  if (response.ok) return true;
  const data = await response.json().catch(() => ({}));
  // Deleted media: "does not exist" / "Unsupported get request" (code 100, subcode 33).
  return data.error?.code === 100 ? false : null;
}

/**
 * Moves every due or in-progress reel one step forward. Safe to call often (every minute):
 * SCHEDULED + due → container created (PUBLISHING) → processed by Instagram → PUBLISHED.
 */
export async function advanceScheduledReels() {
  const now = new Date();
  const projects = await db.videoProject.findMany({
    where: {
      OR: [
        { publishStatus: "SCHEDULED", scheduledAt: { lte: now } },
        { publishStatus: "PUBLISHING" },
      ],
    },
    select: { id: true, tenantId: true, title: true, finalUrl: true, caption: true, publishStatus: true, publishContainerId: true, thumbnailSec: true },
  });

  const results: Array<{ id: string; status: string; error?: string }> = [];
  for (const project of projects) {
    try {
      const { instagramId, token } = await getInstagramConnection(project.tenantId);
      if (project.publishStatus === "SCHEDULED") {
        if (!project.finalUrl?.startsWith("https://")) throw new Error("De eindversie staat nog niet online");
        const containerId = await createReelContainer(instagramId, token, project.finalUrl, project.caption ?? "", project.thumbnailSec);
        await db.videoProject.update({
          where: { id: project.id },
          data: { publishStatus: "PUBLISHING", publishContainerId: containerId, publishError: null },
        });
        results.push({ id: project.id, status: "PUBLISHING" });
        continue;
      }
      const status = await reelContainerStatus(project.publishContainerId!, token);
      if (status.code === "FINISHED") {
        const mediaId = await publishReelContainer(instagramId, token, project.publishContainerId!);
        await db.videoProject.update({
          where: { id: project.id },
          data: { publishStatus: "PUBLISHED", publishedAt: new Date(), instagramMediaId: mediaId, publishError: null },
        });
        results.push({ id: project.id, status: "PUBLISHED" });
      } else if (status.code === "ERROR" || status.code === "EXPIRED") {
        throw new Error(status.message || "Instagram kon de video niet verwerken");
      } else {
        results.push({ id: project.id, status: "PUBLISHING" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Publiceren mislukt";
      await db.videoProject.update({ where: { id: project.id }, data: { publishStatus: "FAILED", publishError: message } });
      results.push({ id: project.id, status: "FAILED", error: message });
    }
  }
  return results;
}

// ─── Carousels ────────────────────────────────────────────────────────────────
// Instagram: one container per image (is_carousel_item), then a CAROUSEL container with the children
// and the caption; once that is processed it is published like a reel.

async function createCarouselContainer(instagramId: string, token: string, imageUrls: string[], caption: string) {
  const children: string[] = [];
  for (const imageUrl of imageUrls.slice(0, 10)) {
    const item = await graphPost(`${instagramId}/media`, token, { image_url: imageUrl, is_carousel_item: "true" });
    children.push(item.id as string);
  }
  const container = await graphPost(`${instagramId}/media`, token, {
    media_type: "CAROUSEL",
    children: children.join(","),
    caption,
  });
  return container.id as string;
}

/** Same steps as the reels: SCHEDULED + due → container (PUBLISHING) → processed → PUBLISHED. */
export async function advanceScheduledCarousels() {
  const now = new Date();
  const carousels = await db.carousel.findMany({
    where: {
      status: "APPROVED",
      OR: [{ publishStatus: "SCHEDULED", scheduledAt: { lte: now } }, { publishStatus: "PUBLISHING" }],
    },
    select: { id: true, tenantId: true, imageUrls: true, caption: true, publishStatus: true, publishContainerId: true },
  });

  const results: Array<{ id: string; status: string; error?: string }> = [];
  for (const carousel of carousels) {
    try {
      const { instagramId, token } = await getInstagramConnection(carousel.tenantId);
      if (carousel.publishStatus === "SCHEDULED") {
        const images = (carousel.imageUrls as string[] | null) ?? [];
        if (images.length < 2) throw new Error("De slides zijn nog niet klaar");
        const containerId = await createCarouselContainer(instagramId, token, images, carousel.caption ?? "");
        await db.carousel.update({
          where: { id: carousel.id },
          data: { publishStatus: "PUBLISHING", publishContainerId: containerId, publishError: null },
        });
        results.push({ id: carousel.id, status: "PUBLISHING" });
        continue;
      }
      const status = await reelContainerStatus(carousel.publishContainerId!, token);
      if (status.code === "FINISHED") {
        const mediaId = await publishReelContainer(instagramId, token, carousel.publishContainerId!);
        await db.carousel.update({
          where: { id: carousel.id },
          data: { publishStatus: "PUBLISHED", publishedAt: new Date(), instagramMediaId: mediaId, publishError: null },
        });
        results.push({ id: carousel.id, status: "PUBLISHED" });
      } else if (status.code === "ERROR" || status.code === "EXPIRED") {
        throw new Error(status.message || "Instagram kon de carousel niet verwerken");
      } else {
        results.push({ id: carousel.id, status: "PUBLISHING" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Publiceren mislukt";
      await db.carousel.update({ where: { id: carousel.id }, data: { publishStatus: "FAILED", publishError: message } });
      results.push({ id: carousel.id, status: "FAILED", error: message });
    }
  }
  return results;
}
