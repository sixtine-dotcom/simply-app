import { db } from "@/lib/db";
import { getValidCanvaToken } from "@/lib/content-integrations";
import { uploadToR2 } from "@/lib/r2";

// Exports a Canva design straight from the app (Canva Connect API): seconds, no Claude task needed.

/** The Canva token of an admin of this tenant (whoever connected Canva). */
export async function canvaTokenForTenant(tenantId: string | null) {
  const connection = await db.integrationConnection.findFirst({
    where: { provider: "canva", user: { tenantId, role: { in: ["ADMIN", "SUPERADMIN"] } } },
    orderBy: { updatedAt: "desc" },
    select: { userId: true },
  });
  return connection ? getValidCanvaToken(connection.userId) : null;
}

/** All pages of a design as JPEGs (1080 wide), stored in R2 for posting. */
export async function exportCanvaDesign(token: string, designId: string, keyPrefix: string) {
  const start = await fetch("https://api.canva.com/rest/v1/exports", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ design_id: designId, format: { type: "jpg", quality: 92, width: 1080 } }),
  });
  if (!start.ok) throw new Error(`Canva-export starten mislukt (${start.status}): ${(await start.text()).slice(0, 200)}`);
  let job = (await start.json()).job;
  for (let i = 0; job?.status === "in_progress" && i < 60; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const poll = await fetch(`https://api.canva.com/rest/v1/exports/${encodeURIComponent(job.id)}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!poll.ok) throw new Error(`Canva-export opvolgen mislukt (${poll.status})`);
    job = (await poll.json()).job;
  }
  if (job?.status !== "success" || !Array.isArray(job.urls)) throw new Error(job?.error?.message || "Canva kon het ontwerp niet exporteren");
  const urls: string[] = [];
  const pages = (job.urls as string[]).slice(0, 10);
  for (let i = 0; i < pages.length; i++) {
    const url = pages[i];
    const file = await fetch(url);
    if (!file.ok) throw new Error(`Slide ${i + 1} downloaden mislukt`);
    const { url: stored } = await uploadToR2({
      key: `${keyPrefix}/${Date.now()}-slide-${String(i + 1).padStart(2, "0")}.jpg`,
      body: Buffer.from(await file.arrayBuffer()),
      contentType: "image/jpeg",
    });
    urls.push(stored);
  }
  return urls;
}

/**
 * Fetches a carousel's slides from Canva in the background (keeps running when she leaves the page).
 * Returns false when Canva is not connected (then the Mac/Claude task picks it up).
 */
export async function startCarouselCanvaExport(carouselId: string, tenantId: string | null, designId: string) {
  if (!/^D[A-Za-z0-9_-]{10}$/.test(designId)) return false;
  const token = await canvaTokenForTenant(tenantId);
  if (!token) return false;
  void (async () => {
    try {
      const imageUrls = await exportCanvaDesign(token, designId, `carousel-studio/${tenantId ?? "default"}/${carouselId}`);
      const current = await db.carousel.findUnique({ where: { id: carouselId }, select: { status: true, publishStatus: true } });
      await db.carousel.update({
        where: { id: carouselId },
        data: {
          imageUrls,
          canvaDesignId: designId,
          renderedAt: new Date(),
          renderRequestedAt: null,
          errorMessage: null,
          ...(current?.status === "APPROVED" ? {} : { status: current?.publishStatus === "SCHEDULED" ? "APPROVED" : "READY" }),
        },
      });
    } catch (error) {
      await db.carousel
        .update({
          where: { id: carouselId },
          data: { status: "IN_CANVA", renderRequestedAt: null, errorMessage: error instanceof Error ? error.message : "Ophalen uit Canva mislukt" },
        })
        .catch(() => {});
    }
  })();
  return true;
}
