import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { VIDEO_PROJECT_STATUSES, requirePipelineToken } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const denied = requirePipelineToken(req);
  if (denied) return denied;
  const { slug } = await params;

  const project = await db.videoProject.findUnique({
    where: { slug },
    include: {
      versions: { orderBy: { number: "desc" }, take: 1 },
      comments: { where: { status: "QUEUED" }, orderBy: { startSec: "asc" } },
    },
  });
  if (!project) return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });

  const { versions, ...rest } = project;
  return NextResponse.json({ project: { ...rest, latestVersion: versions[0] ?? null } });
}

const stepSchema = z.object({
  key: z.string(),
  label: z.string(),
  status: z.enum(["pending", "running", "done", "failed"]),
  message: z.string().nullish(),
  updatedAt: z.string().optional(),
});

const patchSchema = z.object({
  status: z.enum(VIDEO_PROJECT_STATUSES).optional(),
  steps: z.array(stepSchema).optional(),
  errorMessage: z.string().max(4000).nullish(),
  aspectRatio: z.string().max(20).nullish(),
  finalUrl: z.string().url().nullish(),
  finalVersion: z.number().int().positive().nullish(),
  finalDurationSec: z.number().nonnegative().nullish(),
  sourceProxyUrl: z.string().nullish(),
  caption: z.string().max(2200).nullish(),
  captionGeneratedAt: z.string().datetime().nullish(),
  captionRequestedAt: z.null().optional(),
  sourceDurationSec: z.number().nonnegative().nullish(),
  sourceTranscript: z.array(z.tuple([z.string(), z.number(), z.number(), z.number()])).optional(),
  sourceWaveform: z.object({ perSecond: z.number().positive(), peaks: z.array(z.number()) }).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const denied = requirePipelineToken(req);
  if (denied) return denied;
  const { slug } = await params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { sourceTranscript, sourceWaveform, ...rest } = parsed.data;
  const project = await db.videoProject.update({
    where: { slug },
    data: {
      ...rest,
      ...(sourceTranscript ? { sourceTranscript: sourceTranscript as Prisma.InputJsonValue } : {}),
      ...(sourceWaveform ? { sourceWaveform } : {}),
      workerSeenAt: new Date(),
    },
    select: { id: true, slug: true, status: true },
  });
  return NextResponse.json({ project });
}
