import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireVideoAdmin, videoProjectScope } from "@/lib/video-studio";

async function findComment(commentId: string, tenantId: string | null | undefined) {
  return db.videoComment.findFirst({
    where: { id: commentId, project: videoProjectScope(tenantId) },
  });
}

const patchSchema = z.object({
  body: z.string().trim().min(1).max(4000).optional(),
  status: z.enum(["OPEN", "DISMISSED"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { commentId } = await params;
  const existing = await findComment(commentId, user.tenantId);
  if (!existing) return NextResponse.json({ error: "Opmerking niet gevonden" }, { status: 404 });
  if (existing.status === "QUEUED") {
    return NextResponse.json({ error: "Deze opmerking wordt al verwerkt" }, { status: 409 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige wijziging" }, { status: 400 });

  const comment = await db.videoComment.update({ where: { id: commentId }, data: parsed.data });
  return NextResponse.json({ comment });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { commentId } = await params;
  const existing = await findComment(commentId, user.tenantId);
  if (!existing) return NextResponse.json({ error: "Opmerking niet gevonden" }, { status: 404 });
  if (existing.status === "QUEUED") {
    return NextResponse.json({ error: "Deze opmerking wordt al verwerkt" }, { status: 409 });
  }

  await db.videoComment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
