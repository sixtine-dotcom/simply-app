import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { scheduleInput } from "@/lib/social-schedule-input";

export const dynamic = "force-dynamic";
async function admin() {
  const user = await getCurrentUser();
  return user && ["ADMIN", "SUPERADMIN"].includes(user.role) ? user : null;
}
export async function GET() {
  const user = await admin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const jobs = await db.socialPublication.findMany({ where: { userId: user.id, status: { not: "CANCELLED" } }, orderBy: { updatedAt: "desc" } });
  const drafts = Array.from(new Map(jobs.map((j) => [j.draftId, j.draft])).values());
  return NextResponse.json({ drafts, deliveries: jobs.map(({ publicationId, platform, status, lastError }) => ({ publicationId, platform, status, lastError })) });
}
export async function POST(request: Request) {
  const user = await admin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const parsed = scheduleInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const draft = parsed.data;
  const media = draft.video.mediaUrls.map((url) => ({ url, type: draft.video.mimeType.startsWith("video/") ? "video" : "image" }));
  try {
    await db.$transaction(async (tx) => {
      const collisions = await tx.socialPublication.count({ where: { userId: user.id, publicationId: { in: draft.publications.map((p) => p.id) }, draftId: { not: draft.video.id } } });
      if (collisions) throw new Error("Dit publicatiemoment hoort bij een andere post. Maak een nieuw moment aan.");
      const existing = await tx.socialPublication.findMany({ where: { userId: user.id, draftId: draft.video.id } });
      if (existing.some((j) => ["CLAIMED", "PROCESSING"].includes(j.status))) throw new Error("Deze post wordt al verwerkt. Wacht tot de publicatie klaar is.");
      const wanted = new Set(draft.publications.flatMap((p) => p.platforms.map((platform) => `${p.id}:${platform}`)));
      for (const job of existing) {
        if (!wanted.has(`${job.publicationId}:${job.platform}`) && job.status !== "PUBLISHED") {
          await tx.socialPublication.update({ where: { id: job.id }, data: { status: "CANCELLED" } });
        }
      }
      for (const publication of draft.publications) {
        for (const platform of publication.platforms) {
          const prior = existing.find((j) => j.publicationId === publication.id && j.platform === platform);
          // Keep completed and uncertain deliveries; editing must not send a duplicate.
          if (prior && ["PUBLISHED", "REVIEW", "FAILED"].includes(prior.status)) continue;
          if (new Date(publication.scheduledAt).getTime() <= Date.now()) throw new Error("Kies een publicatiemoment in de toekomst");
          const data = { draftId: draft.video.id, draft: draft as Prisma.InputJsonValue, media, caption: platform === "tiktok" ? publication.tiktokCaption?.trim() || publication.caption : publication.caption, format: publication.format, scheduledAt: new Date(publication.scheduledAt), status: "SCHEDULED", lastError: null };
          await tx.socialPublication.upsert({ where: { userId_publicationId_platform: { userId: user.id, publicationId: publication.id, platform } }, create: { ...data, userId: user.id, publicationId: publication.id, platform }, update: data });
        }
      }
      await tx.socialPublication.updateMany({ where: { userId: user.id, draftId: draft.video.id }, data: { draft: draft as Prisma.InputJsonValue } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Inplannen mislukt" }, { status: 409 });
  }
}
export async function DELETE(request: Request) {
  const user = await admin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Post ontbreekt" }, { status: 400 });
  try {
    await db.$transaction(async (tx) => {
      const busy = await tx.socialPublication.count({ where: { userId: user.id, draftId: id, status: { in: ["CLAIMED", "PROCESSING"] } } });
      if (busy) throw new Error("Deze post wordt al gepubliceerd");
      await tx.socialPublication.updateMany({ where: { userId: user.id, draftId: id }, data: { status: "CANCELLED" } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Deze post wordt al gepubliceerd" }, { status: 409 }); }
}
