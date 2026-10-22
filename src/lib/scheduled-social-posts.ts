import { db } from "@/lib/db";
import { publishSocial } from "@/lib/social-publish";
import { getTikTokPublishStatus, getValidTikTokToken } from "@/lib/tiktok";

// Claim each delivery atomically. A timeout is never blindly retried: that could post twice.
const defaultDependencies = { db, publishSocial, getTikTokPublishStatus, getValidTikTokToken };

export async function advanceScheduledSocialPosts(dependencies = defaultDependencies) {
  const { db, publishSocial, getTikTokPublishStatus, getValidTikTokToken } = dependencies;
  await db.socialPublication.updateMany({
    where: { status: "CLAIMED", claimedAt: { lt: new Date(Date.now() - 10 * 60_000) } },
    data: { status: "REVIEW", lastError: "Publicatie onderbroken. Controleer het kanaal voordat je opnieuw inplant." },
  });
  const jobs = await db.socialPublication.findMany({
    where: { OR: [{ status: "SCHEDULED", scheduledAt: { lte: new Date() } }, { status: "PROCESSING" }] },
    orderBy: { scheduledAt: "asc" }, take: 3,
    include: { user: { select: { role: true } } },
  });
  const results = [];
  const startedAt = Date.now();
  for (const job of jobs) {
    if (Date.now() - startedAt > 240_000) break;
    const claimed = await db.socialPublication.updateMany({ where: { id: job.id, status: job.status }, data: { status: "CLAIMED", claimedAt: new Date() } });
    if (!claimed.count) continue;
    try {
      if (!["ADMIN", "SUPERADMIN"].includes(job.user.role)) throw new Error("De eigenaar heeft geen publicatierechten meer");
      if (job.status === "PROCESSING" && job.remoteId && job.platform === "tiktok") {
        const token = await getValidTikTokToken(job.userId);
        if (!token) throw new Error("Koppel TikTok opnieuw");
        const status = await getTikTokPublishStatus(token, job.remoteId);
        if (status.status === "FAILED") throw new Error(status.fail_reason || "TikTok-publicatie mislukt");
        const complete = status.status === "PUBLISH_COMPLETE";
        await db.socialPublication.update({ where: { id: job.id }, data: { status: complete ? "PUBLISHED" : "PROCESSING", publishedAt: complete ? new Date() : null } });
        results.push({ id: job.id, status: complete ? "PUBLISHED" : "PROCESSING" });
        continue;
      }
      const result = await publishSocial({
        userId: job.userId, platforms: [job.platform], caption: job.caption, format: job.format,
        media: job.media as { url: string; type: "image" | "video" }[], waitForTikTok: false,
        onTikTokInitialized: async (remoteId) => { await db.socialPublication.update({ where: { id: job.id }, data: { remoteId } }); },
      });
      if (result.errors[job.platform]) throw new Error(result.errors[job.platform]);
      const remoteId = result.tiktokPublishId || result.instagramId || result.facebookId;
      if (!remoteId) throw new Error("Het kanaal gaf geen publicatiebevestiging terug");
      const status = job.platform === "tiktok" && result.tiktokStatus !== "PUBLISH_COMPLETE" ? "PROCESSING" : "PUBLISHED";
      await db.socialPublication.update({ where: { id: job.id }, data: { status, remoteId, publishedAt: status === "PUBLISHED" ? new Date() : null, lastError: null } });
      results.push({ id: job.id, status });
    } catch (error) {
      const lastError = error instanceof Error ? error.message : "Publiceren mislukt";
      await db.socialPublication.update({ where: { id: job.id }, data: { status: "FAILED", lastError } });
      results.push({ id: job.id, status: "FAILED", error: lastError });
    }
  }
  return results;
}
