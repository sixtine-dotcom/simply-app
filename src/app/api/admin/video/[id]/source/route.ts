import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findVideoProjectForAdmin, requireVideoAdmin } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

// The full recording (proxy, transcript, waveform) for the cut editor. Loaded once, not polled.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { id } = await params;
  if (!(await findVideoProjectForAdmin(id, user.tenantId))) {
    return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });
  }
  const source = await db.videoProject.findUnique({
    where: { id },
    select: { sourceProxyUrl: true, sourceDurationSec: true, sourceTranscript: true, sourceWaveform: true },
  });
  return NextResponse.json({ source });
}
