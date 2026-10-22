import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireVideoAdmin } from "@/lib/video-studio";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ animationId: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { animationId } = await params;
  await db.videoAnimation.deleteMany({ where: { id: animationId, tenantId: user.tenantId ?? null } });
  return NextResponse.json({ ok: true });
}
