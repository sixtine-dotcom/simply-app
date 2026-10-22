import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireVideoAdmin } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const s = await db.scriptSettings.findFirst({ where: { tenantId: user.tenantId ?? null } });
  return NextResponse.json({
    settings: {
      briefing: s?.briefing ?? "",
      idealClient: s?.idealClient ?? "",
      myStory: s?.myStory ?? "",
      hooks: s?.hooks ?? "",
      hooksUpdatedAt: s?.hooksUpdatedAt ?? null,
      hooksRequestedAt: s?.hooksRequestedAt ?? null,
      perWeek: s?.perWeek ?? 7,
      enabled: s?.enabled ?? false,
    },
  });
}

const schema = z.object({
  briefing: z.string().max(60000).optional(),
  idealClient: z.string().max(20000).optional(),
  myStory: z.string().max(30000).optional(),
  hooks: z.string().max(60000).optional(),
  perWeek: z.number().int().min(1).max(14).optional(),
  enabled: z.boolean().optional(),
  // "Zoek nu nieuwe virale hooks"
  refreshHooks: z.boolean().optional(),
});

export async function PUT(req: Request) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const { refreshHooks, ...rest } = parsed.data;
  const data = { ...rest, ...(refreshHooks ? { hooksRequestedAt: new Date() } : {}) };
  const tenantId = user.tenantId ?? null;
  const existing = await db.scriptSettings.findFirst({ where: { tenantId } });
  const settings = existing ? await db.scriptSettings.update({ where: { id: existing.id }, data }) : await db.scriptSettings.create({ data: { ...data, tenantId } });
  return NextResponse.json({ settings });
}
