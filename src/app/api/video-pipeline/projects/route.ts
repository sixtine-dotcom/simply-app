import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { DEFAULT_VIDEO_STEPS, VIDEO_MODES, requirePipelineToken } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

// The local pipeline polls this list to create folders and pick up feedback.
export async function GET(req: NextRequest) {
  const denied = requirePipelineToken(req);
  if (denied) return denied;

  // Approved projects stay listed for a week so the pipeline can render the final export.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const projects = await db.videoProject.findMany({
    where: { OR: [{ status: { not: "APPROVED" } }, { approvedAt: { gte: weekAgo } }] },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      mode: true,
      status: true,
      feedbackRequestedAt: true,
      manualEdit: true,
      sourceProxyUrl: true,
      captionRequestedAt: true,
      caption: true,
      versions: { orderBy: { number: "desc" }, take: 1, select: { number: true } },
      _count: { select: { comments: { where: { status: "QUEUED" } } } },
    },
  });

  return NextResponse.json({
    projects: projects.map(({ versions, _count, manualEdit, sourceProxyUrl, captionRequestedAt, caption, ...project }) => ({
      ...project,
      needsCaption: project.mode !== "COURSE" && project.status === "APPROVED" && (captionRequestedAt !== null || caption === null),
      // Only real hand cuts count (an empty leftover value made feedback fail with "Geen handmatige knippen gevonden").
      hasManualEdit: ((manualEdit as { segments?: unknown[] } | null)?.segments?.length ?? 0) > 0,
      // "Opnieuw knippen" after changing the briefing: a fresh AI edit instead of hand cuts.
      redo: (manualEdit as { redo?: boolean } | null)?.redo === true,
      hasSource: Boolean(sourceProxyUrl),
      latestVersion: versions[0]?.number ?? 0,
      queuedComments: _count.comments,
    })),
  });
}

const createSchema = z.object({
  slug: z.string().trim().min(1).max(120).regex(/^[\w.-]+$/),
  title: z.string().trim().min(1).max(200),
  mode: z.enum(VIDEO_MODES).default("SOCIAL"),
});

// Called when a folder is created on the Mac (instead of in the app).
export async function POST(req: NextRequest) {
  const denied = requirePipelineToken(req);
  if (denied) return denied;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const project = await db.videoProject.upsert({
    where: { slug: parsed.data.slug },
    update: {},
    create: {
      slug: parsed.data.slug,
      title: parsed.data.title,
      mode: parsed.data.mode,
      tenantId: process.env.VIDEO_PIPELINE_TENANT_ID?.trim() || null,
      steps: DEFAULT_VIDEO_STEPS,
    },
  });

  return NextResponse.json({ project });
}
