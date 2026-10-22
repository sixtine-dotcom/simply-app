import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { findVideoProjectForAdmin, requireVideoAdmin } from "@/lib/video-studio";

const schema = z.object({
  basedOnVersion: z.number().int().positive(),
  segments: z
    .array(z.object({ start: z.number().nonnegative(), end: z.number().positive() }))
    .min(1, "Er moet minstens één stuk overblijven")
    .max(5000),
});

// Hand-made cuts from the editor: the Mac renders them as the next version (no AI involved).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { id } = await params;
  const project = await findVideoProjectForAdmin(id, user.tenantId);
  if (!project) return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });
  if (["PROCESSING", "APPLYING_FEEDBACK"].includes(project.status)) {
    return NextResponse.json({ error: "Er wordt al een versie gemaakt. Probeer het zo meteen opnieuw." }, { status: 409 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const duration = project.sourceDurationSec ?? Infinity;
  const segments = parsed.data.segments
    .map((s) => ({ start: Math.max(0, s.start), end: Math.min(duration, s.end) }))
    .filter((s) => s.end - s.start >= 0.05)
    .sort((a, b) => a.start - b.start);
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].start < segments[i - 1].end - 0.001) {
      return NextResponse.json({ error: "Stukken mogen elkaar niet overlappen" }, { status: 400 });
    }
  }

  await db.videoProject.update({
    where: { id },
    data: {
      manualEdit: { segments, basedOnVersion: parsed.data.basedOnVersion },
      status: "APPLYING_FEEDBACK",
      feedbackRequestedAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true });
}
