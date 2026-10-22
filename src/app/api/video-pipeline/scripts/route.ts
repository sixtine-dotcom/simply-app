import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePipelineToken } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

const tenantId = () => process.env.VIDEO_PIPELINE_TENANT_ID?.trim() || null;

// What the Mac has to do for Reel Scripts: settings, scripts to (re)write, recent scripts (no repeats).
export async function GET(req: NextRequest) {
  const denied = requirePipelineToken(req);
  if (denied) return denied;
  const settings = await db.scriptSettings.findFirst({ where: { tenantId: tenantId() } });
  const needWriting = await db.reelScript.findMany({ where: { tenantId: tenantId(), status: "WRITING" }, take: 5 });
  const recent = await db.reelScript.findMany({
    where: { tenantId: tenantId(), createdAt: { gte: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
    select: { headline: true, topic: true, hookFormat: true, createdAt: true, weekStart: true },
    take: 120,
  });
  return NextResponse.json({ settings, needWriting, recent });
}

const scriptSchema = z.object({
  headline: z.string().trim().min(1).max(200),
  topic: z.string().max(300).optional(),
  hook: z.string().max(2000),
  credibility: z.string().max(2000),
  value: z.string().max(8000),
  cta: z.string().max(2000),
  hookFormat: z.string().max(300).optional(),
  storyNote: z.string().max(2000).optional(),
  weekStart: z.string().datetime().optional(),
});

// POST { scripts: [...] }: a new week written on the Mac · { hooks }: refreshed hook library.
export async function POST(req: NextRequest) {
  const denied = requirePipelineToken(req);
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (typeof body?.hooks === "string") {
    await db.scriptSettings.updateMany({ where: { tenantId: tenantId() }, data: { hooks: body.hooks.slice(0, 60000), hooksUpdatedAt: new Date(), hooksRequestedAt: null } });
    return NextResponse.json({ ok: true });
  }
  const parsed = z.object({ scripts: z.array(scriptSchema).max(14) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  for (const s of parsed.data.scripts) {
    await db.reelScript.create({ data: { ...s, weekStart: s.weekStart ? new Date(s.weekStart) : null, tenantId: tenantId(), status: "DRAFT" } });
  }
  await db.scriptSettings.updateMany({ where: { tenantId: tenantId() }, data: { generateRequestedAt: null } });
  return NextResponse.json({ ok: true, count: parsed.data.scripts.length });
}
