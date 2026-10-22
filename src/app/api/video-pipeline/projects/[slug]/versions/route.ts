import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePipelineToken } from "@/lib/video-studio";

const wordSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
  src: z.number().nullish(),
  speaker: z.string().nullish(),
});

const schema = z.object({
  proxyUrl: z.string().url(),
  posterUrl: z.string().url().nullish(),
  durationSec: z.number().nonnegative().nullish(),
  width: z.number().int().positive().nullish(),
  height: z.number().int().positive().nullish(),
  transcript: z.array(wordSchema),
  edl: z.unknown().optional(),
  changeSummary: z.string().max(8000).nullish(),
  // What the pipeline did with each queued comment.
  resolutions: z
    .array(z.object({ commentId: z.string(), applied: z.boolean(), note: z.string().max(2000) }))
    .default([]),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const denied = requirePipelineToken(req);
  if (denied) return denied;
  const { slug } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { resolutions, edl, ...data } = parsed.data;

  const project = await db.videoProject.findUnique({
    where: { slug },
    select: { id: true, versions: { orderBy: { number: "desc" }, take: 1, select: { number: true } } },
  });
  if (!project) return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });

  const version = await db.$transaction(async (tx) => {
    const created = await tx.videoVersion.create({
      data: {
        ...data,
        edl: edl === undefined ? undefined : (edl as object),
        projectId: project.id,
        number: (project.versions[0]?.number ?? 0) + 1,
      },
    });
    for (const resolution of resolutions) {
      await tx.videoComment.updateMany({
        where: { id: resolution.commentId, projectId: project.id },
        data: { status: resolution.applied ? "APPLIED" : "OPEN", resolution: resolution.note },
      });
    }
    await tx.videoProject.update({
      where: { id: project.id },
      data: {
        status: "READY_FOR_REVIEW",
        feedbackRequestedAt: null,
        manualEdit: Prisma.DbNull,
        errorMessage: null,
        workerSeenAt: new Date(),
      },
    });
    return created;
  });

  return NextResponse.json({ version });
}
