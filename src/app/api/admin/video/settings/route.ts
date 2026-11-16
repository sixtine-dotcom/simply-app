import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireVideoAdmin } from "@/lib/video-studio";

const schema = z.object({
  captionExamples: z.string().max(60000).nullable(),
  captionGuidelines: z.string().max(4000).nullable(),
  editingGuidelines: z.string().max(4000).nullable(),
});

// Tone of voice for AI captions: example captions and extra guidelines.
export async function GET() {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const settings = await db.videoStudioSettings.findUnique({ where: { tenantId: user.tenantId ?? "" } });
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  if (!user.tenantId) return NextResponse.json({ error: "Account zonder tenant" }, { status: 400 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const settings = await db.videoStudioSettings.upsert({
    where: { tenantId: user.tenantId },
    create: { tenantId: user.tenantId, ...parsed.data },
    update: parsed.data,
  });
  return NextResponse.json({ settings });
}
