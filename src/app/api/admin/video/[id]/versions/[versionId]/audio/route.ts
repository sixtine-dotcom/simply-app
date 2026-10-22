import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { TimelineSegment, findVideoProjectForAdmin, outputToSource, requireVideoAdmin } from "@/lib/video-studio";

const schema = z.object({
  audio: z.object({
    music: z.object({ src: z.string().min(1).max(2000), label: z.string().max(200), volume: z.number().min(0).max(1), duck: z.boolean() }).nullable(),
    voiceVolume: z.number().min(0).max(2),
    sfx: z
      .array(z.object({ id: z.string().max(80), src: z.string().min(1).max(2000), label: z.string().max(200), at: z.number().nonnegative(), volume: z.number().min(0).max(1.5) }))
      .max(100),
  }),
});

// Saves the sound settings (music, effects, voice level) of one version.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { id, versionId } = await params;
  if (!(await findVideoProjectForAdmin(id, user.tenantId))) {
    return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const version = await db.videoVersion.findFirst({ where: { id: versionId, projectId: id } });
  if (!version) return NextResponse.json({ error: "Versie niet gevonden" }, { status: 404 });
  const edl = (version.edl ?? {}) as { segments?: TimelineSegment[]; style?: Record<string, unknown> };
  const segments = edl.segments ?? [];
  // Sound effects also remember their raw-footage time, so they stay put after a new cut.
  const audio = { ...parsed.data.audio, sfx: parsed.data.audio.sfx.map((fx) => ({ ...fx, sourceAt: outputToSource(segments, fx.at) })) };
  await db.videoVersion.update({
    where: { id: version.id },
    data: { edl: { ...edl, style: { ...(edl.style ?? {}), audio } } as Prisma.InputJsonValue },
  });
  return NextResponse.json({ ok: true });
}
