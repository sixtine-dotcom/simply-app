import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { findVideoProjectForAdmin, requireVideoAdmin } from "@/lib/video-studio";
import { advanceScheduledReels, getInstagramConnection, instagramPostExists } from "@/lib/instagram-publish";

type HistoryEntry = { publishedAt: string | null; instagramMediaId?: string | null; caption?: string | null; removed?: boolean };

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save-caption"), caption: z.string().max(2200) }),
  z.object({ action: z.literal("regenerate-caption") }),
  z.object({ action: z.literal("schedule"), caption: z.string().min(1, "Caption is leeg").max(2200), scheduledAt: z.string().datetime() }),
  z.object({ action: z.literal("publish-now"), caption: z.string().min(1, "Caption is leeg").max(2200) }),
  z.object({ action: z.literal("cancel") }),
  // Instagram cover: a moment in the final video (null = Instagram's default).
  z.object({ action: z.literal("set-thumbnail"), seconds: z.number().min(0).max(3600).nullable() }),
  // Looks up on Instagram which earlier posts were deleted from the profile.
  z.object({ action: z.literal("check-posts") }),
  // By hand: this post is not on the profile any more (removed from the list). index = position in the history, "current" = latest post.
  z.object({ action: z.literal("mark-removed"), index: z.union([z.number().int().nonnegative(), z.literal("current")]), removed: z.boolean() }),
]);

// Instagram caption + scheduling for an approved reel.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { id } = await params;
  const project = await findVideoProjectForAdmin(id, user.tenantId);
  if (!project) return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const input = parsed.data;

  if (input.action === "save-caption") {
    await db.videoProject.update({ where: { id }, data: { caption: input.caption } });
    return NextResponse.json({ ok: true });
  }
  if (input.action === "regenerate-caption") {
    await db.videoProject.update({ where: { id }, data: { captionRequestedAt: new Date() } });
    return NextResponse.json({ ok: true });
  }
  if (input.action === "set-thumbnail") {
    await db.videoProject.update({ where: { id }, data: { thumbnailSec: input.seconds } });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "check-posts" || input.action === "mark-removed") {
    const history = ((project.publishHistory as HistoryEntry[] | null) ?? []).map((h) => ({ ...h }));
    let currentRemoved = false;
    if (input.action === "mark-removed") {
      if (input.index === "current") currentRemoved = input.removed;
      else if (history[input.index]) history[input.index].removed = input.removed;
    } else {
      const { token } = await getInstagramConnection(project.tenantId);
      for (const entry of history) {
        if (!entry.instagramMediaId || entry.removed) continue;
        if ((await instagramPostExists(entry.instagramMediaId, token)) === false) entry.removed = true;
      }
      if (project.publishStatus === "PUBLISHED" && project.instagramMediaId) {
        currentRemoved = (await instagramPostExists(project.instagramMediaId, token)) === false;
      }
    }
    // Posts deleted from Instagram are dropped from the history; the reel is ready to post again.
    const kept = history.filter((h) => !h.removed);
    const current =
      currentRemoved && project.publishStatus === "PUBLISHED"
        ? {
            publishHistory: kept as Prisma.InputJsonValue,
            publishStatus: null,
            publishedAt: null,
            instagramMediaId: null,
            scheduledAt: null,
          }
        : { publishHistory: kept as Prisma.InputJsonValue };
    await db.videoProject.update({ where: { id }, data: current });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "cancel") {
    if (project.publishStatus === "PUBLISHING" || project.publishStatus === "PUBLISHED") {
      return NextResponse.json({ error: "Deze reel wordt al gepubliceerd" }, { status: 409 });
    }
    await db.videoProject.update({ where: { id }, data: { publishStatus: null, scheduledAt: null, publishError: null } });
    return NextResponse.json({ ok: true });
  }

  // schedule / publish-now
  if (project.status !== "APPROVED" || !project.finalUrl?.startsWith("https://")) {
    return NextResponse.json({ error: "Keur de video eerst goed en wacht tot de eindversie online staat" }, { status: 400 });
  }
  if (project.publishStatus === "PUBLISHING") {
    return NextResponse.json({ error: "Deze reel wordt nu gepubliceerd. Probeer het zo meteen opnieuw." }, { status: 409 });
  }
  // Posting again: keep the earlier post in the history, then schedule the same reel anew.
  const history = (project.publishHistory as Array<Record<string, unknown>> | null) ?? [];
  const archived =
    project.publishStatus === "PUBLISHED"
      ? [...history, { publishedAt: project.publishedAt?.toISOString() ?? null, instagramMediaId: project.instagramMediaId, caption: project.caption }]
      : history;
  const scheduledAt = input.action === "schedule" ? new Date(input.scheduledAt) : new Date();
  if (input.action === "schedule" && scheduledAt.getTime() < Date.now() - 60_000) {
    return NextResponse.json({ error: "Kies een moment in de toekomst" }, { status: 400 });
  }
  await db.videoProject.update({
    where: { id },
    data: {
      caption: input.caption,
      scheduledAt,
      publishStatus: "SCHEDULED",
      publishError: null,
      publishContainerId: null,
      publishedAt: null,
      instagramMediaId: null,
      publishHistory: archived as Prisma.InputJsonValue,
    },
  });
  if (input.action === "publish-now") await advanceScheduledReels();
  return NextResponse.json({ ok: true });
}
