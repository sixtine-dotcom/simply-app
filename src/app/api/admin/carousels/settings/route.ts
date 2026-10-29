import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireVideoAdmin } from "@/lib/video-studio";
import { DEFAULT_THEME } from "@/lib/carousel-shared";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const settings = await db.carouselSettings.findFirst({ where: { tenantId: user.tenantId ?? null } });
  return NextResponse.json({
    settings: {
      briefing: settings?.briefing ?? "",
      topics: settings?.topics ?? "",
      theme: { ...DEFAULT_THEME, ...((settings?.theme as object | null) ?? {}) },
      perWeek: settings?.perWeek ?? 7,
      postTime: settings?.postTime ?? "07:00",
      autoPublish: settings?.autoPublish ?? false,
      enabled: settings?.enabled ?? true,
      generateRequestedAt: settings?.generateRequestedAt ?? null,
    },
  });
}

const schema = z.object({
  briefing: z.string().max(60000).optional(),
  topics: z.string().max(20000).optional(),
  theme: z
    .object({
      background: z.enum(["photo", "plain"]),
      backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      shade: z.number().min(0).max(0.8),
      proofTitle: z.string().max(80).optional(),
      proofImages: z.array(z.string().url()).max(20).optional(),
      template: z.string().max(40).optional(),
      label: z.string().trim().max(40).optional(),
      handle: z.string().trim().max(40).transform((h) => h.replace(/^@/, "")).optional(),
      footer: z.string().trim().max(40).optional(),
    })
    .optional(),
  postTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  autoPublish: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export async function PUT(req: Request) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const { theme, ...rest } = parsed.data;
  const data = { ...rest, ...(theme ? { theme: theme as Prisma.InputJsonValue } : {}) };
  const existing = await db.carouselSettings.findFirst({ where: { tenantId: user.tenantId ?? null } });
  const settings = existing
    ? await db.carouselSettings.update({ where: { id: existing.id }, data })
    : await db.carouselSettings.create({ data: { ...data, tenantId: user.tenantId ?? null } });
  return NextResponse.json({ settings });
}
