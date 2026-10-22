import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireVideoAdmin } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

const fromIdeaSchema = z.object({
  action: z.literal("from-idea"),
  idea: z.string().trim().min(10, "Beschrijf je idee in een paar zinnen").max(10000),
});

// POST (no body): "Maak nu een week" · { action: "cancel" } · { action: "from-idea", idea }: script from her own brain dump.
export async function POST(req: Request) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const tenantId = user.tenantId ?? null;
  const body = await req.json().catch(() => null);
  if (body?.action === "cancel") {
    await db.scriptSettings.updateMany({ where: { tenantId }, data: { generateRequestedAt: null } });
    return NextResponse.json({ ok: true });
  }
  if (body?.action === "from-idea") {
    const parsed = fromIdeaSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    const script = await db.reelScript.create({
      data: { tenantId, headline: "Script uit eigen idee", hook: "", credibility: "", value: "", cta: "", status: "WRITING", feedback: `EIGEN IDEE / BRAIN DUMP:\n${parsed.data.idea}` },
    });
    return NextResponse.json({ script });
  }
  const existing = await db.scriptSettings.findFirst({ where: { tenantId } });
  if (existing) await db.scriptSettings.update({ where: { id: existing.id }, data: { generateRequestedAt: new Date() } });
  else await db.scriptSettings.create({ data: { tenantId, generateRequestedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
