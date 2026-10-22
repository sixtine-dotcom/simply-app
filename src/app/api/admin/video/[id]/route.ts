import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { REVIEW_PROJECT_SELECT, VIDEO_MODES, findVideoProjectForAdmin, requireVideoAdmin } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

// Polled by the review page for live status, new versions and comment resolutions.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { id } = await params;
  if (!(await findVideoProjectForAdmin(id, user.tenantId))) {
    return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });
  }

  const project = await db.videoProject.findUnique({
    where: { id },
    // The full-recording transcript/waveform are large and only needed by the cut editor (see ./source).
    select: REVIEW_PROJECT_SELECT,
  });
  return NextResponse.json({ project });
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["approve", "reopen", "retry"]) }),
  z.object({ action: z.literal("rename"), title: z.string().trim().min(2, "Titel is te kort").max(200) }),
  z.object({
    action: z.literal("settings"),
    // Social / Cursus / Kant-en-klaar can still change before the video is approved.
    mode: z.enum(VIDEO_MODES).optional(),
    briefing: z.string().trim().max(4000).nullish(),
    cutByVisuals: z.boolean().optional(),
    colorMatch: z.number().min(0).max(1).nullable().optional(),
    // "recut" = new AI edit with the new briefing · "color" = same cuts, new colours
    redo: z.enum(["recut", "color"]).optional(),
  }),
]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { id } = await params;
  if (!(await findVideoProjectForAdmin(id, user.tenantId))) {
    return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige actie" }, { status: 400 });

  if (parsed.data.action === "settings") {
    const { mode, briefing, cutByVisuals, colorMatch, redo } = parsed.data;
    const current = await db.videoProject.findUnique({
      where: { id },
      select: { status: true, versions: { orderBy: { number: "desc" }, take: 1, select: { number: true, edl: true } } },
    });
    const latest = current?.versions[0];
    if (redo && current && ["PROCESSING", "APPLYING_FEEDBACK"].includes(current.status)) {
      return NextResponse.json({ error: "Er wordt al een versie gemaakt. Probeer het zo meteen opnieuw." }, { status: 409 });
    }
    const segments = (latest?.edl as { segments?: Array<{ start: number; end: number }> } | null)?.segments;
    const rerun =
      redo === "recut" && latest
        ? { manualEdit: { redo: true }, status: "APPLYING_FEEDBACK", approvedAt: null, feedbackRequestedAt: new Date() }
        : redo === "color" && latest && segments?.length
          ? {
              // Same cuts in the same order, rendered again with the new colours.
              manualEdit: { segments: segments.map(({ start, end }) => ({ start, end })), basedOnVersion: latest.number },
              status: "APPLYING_FEEDBACK",
              approvedAt: null,
              feedbackRequestedAt: new Date(),
            }
          : {};
    const project = await db.videoProject.update({
      where: { id },
      data: {
        ...(mode ? { mode } : {}),
        // Kant-en-klaar (or course): never colour-matched or cut on visuals.
        ...(mode === "FINISHED" || mode === "COURSE" ? { colorMatch: null, cutByVisuals: false } : {}),
        ...(briefing !== undefined ? { briefing: briefing || null } : {}),
        ...(cutByVisuals !== undefined ? { cutByVisuals } : {}),
        ...(colorMatch !== undefined ? { colorMatch } : {}),
        ...rerun,
      },
      select: REVIEW_PROJECT_SELECT,
    });
    return NextResponse.json({ project });
  }

  if (parsed.data.action === "rename") {
    const project = await db.videoProject.update({ where: { id }, data: { title: parsed.data.title } });
    return NextResponse.json({ project });
  }

  const project = await db.videoProject.update({
    where: { id },
    data:
      parsed.data.action === "approve"
        ? { status: "APPROVED", approvedAt: new Date() }
        : parsed.data.action === "retry"
          ? { status: "WAITING_FOR_FOOTAGE", errorMessage: null }
          : { status: "READY_FOR_REVIEW", approvedAt: null },
  });
  return NextResponse.json({ project });
}

// Removes the project, its versions and comments from the app. The folder on the Mac is left alone.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { id } = await params;
  if (!(await findVideoProjectForAdmin(id, user.tenantId))) {
    return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });
  }
  await db.videoProject.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
