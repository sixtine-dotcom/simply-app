import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireVideoAdmin } from "@/lib/video-studio";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ audioId: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { audioId } = await params;
  await db.videoAudio.deleteMany({ where: { id: audioId, tenantId: user.tenantId ?? null } });
  return NextResponse.json({ ok: true });
}
