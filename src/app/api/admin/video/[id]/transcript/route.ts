import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  TimelineSegment,
  TranscriptOverride,
  TranscriptWord,
  findVideoProjectForAdmin,
  outputToSource,
  replaceTranscriptText,
  requireVideoAdmin,
} from "@/lib/video-studio";

const schema = z.object({
  versionId: z.string(),
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
  text: z.string().trim().min(1, "Tekst mag niet leeg zijn").max(1000),
});

// Direct text correction from the review page: updates this version's captions right away and
// stores the correction on the raw-footage timeline so the pipeline keeps it in later versions.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { id } = await params;
  const project = await findVideoProjectForAdmin(id, user.tenantId);
  if (!project) return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { versionId, text } = parsed.data;
  const from = Math.min(parsed.data.from, parsed.data.to);
  const to = Math.max(parsed.data.from, parsed.data.to);

  const version = await db.videoVersion.findFirst({ where: { id: versionId, projectId: id } });
  const words = (version?.transcript as TranscriptWord[] | null) ?? [];
  if (!version || to >= words.length) {
    return NextResponse.json({ error: "Versie of tekst niet gevonden" }, { status: 404 });
  }

  const segments = ((version.edl as { segments?: TimelineSegment[] } | null)?.segments ?? []) as TimelineSegment[];
  const override: TranscriptOverride = {
    sourceStart: words[from].src ?? outputToSource(segments, words[from].start),
    sourceEnd: outputToSource(segments, words[to].end),
    text,
  };
  const overrides = ((project.transcriptOverrides as TranscriptOverride[] | null) ?? []).filter(
    // A newer correction of the same stretch replaces the older one.
    (o) => o.sourceEnd <= override.sourceStart || o.sourceStart >= override.sourceEnd
  );

  const transcript = replaceTranscriptText(words, from, to, text);
  const [updated] = await db.$transaction([
    db.videoVersion.update({ where: { id: version.id }, data: { transcript } }),
    db.videoProject.update({ where: { id }, data: { transcriptOverrides: [...overrides, override] } }),
  ]);
  return NextResponse.json({ version: updated });
}
