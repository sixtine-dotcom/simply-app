import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { TimelineSegment, findVideoProjectForAdmin, outputToSource, requireVideoAdmin } from "@/lib/video-studio";

const overlaySchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(["lottie", "video", "image", "motion"]),
  src: z.string().min(1).max(2000),
  label: z.string().max(200),
  preview: z.string().max(2000).optional(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  size: z.number().min(0.05).max(1),
  manual: z.boolean().optional(),
  behind: z.boolean().optional(),
  data: z.record(z.unknown()).optional(),
  fit: z.enum(["frame", "window"]).optional(),
  chart: z.string().max(4000).optional(),
  query: z.string().max(200).optional(),
  ref: z.string().optional(),
  fromWord: z.number().optional(),
  toWord: z.number().optional(),
  placement: z.string().optional(),
});

// Saves the animations of one version after editing them in the review page.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { id, versionId } = await params;
  if (!(await findVideoProjectForAdmin(id, user.tenantId))) {
    return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });
  }
  const parsed = z.object({ overlays: z.array(overlaySchema).max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const version = await db.videoVersion.findFirst({ where: { id: versionId, projectId: id } });
  if (!version) return NextResponse.json({ error: "Versie niet gevonden" }, { status: 404 });
  const edl = (version.edl ?? {}) as { segments?: TimelineSegment[]; style?: Record<string, unknown> };
  const segments = edl.segments ?? [];
  // Hand-made animations also remember their raw-footage time, so they survive a new cut.
  const overlays = parsed.data.overlays.map((o) =>
    o.manual
      ? { ...o, end: Math.max(o.end, o.start + 0.5), sourceStart: outputToSource(segments, o.start), sourceEnd: outputToSource(segments, o.end) }
      : o
  );
  await db.videoVersion.update({
    where: { id: version.id },
    data: { edl: { ...edl, style: { ...(edl.style ?? {}), overlays } } as Prisma.InputJsonValue },
  });
  return NextResponse.json({ ok: true, overlays });
}
