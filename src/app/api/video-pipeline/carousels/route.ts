import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePipelineToken } from "@/lib/video-studio";
import { DEFAULT_THEME } from "@/lib/carousel-shared";

export const dynamic = "force-dynamic";

const tenantId = () => process.env.VIDEO_PIPELINE_TENANT_ID?.trim() || null;

// What the Mac has to do for Carousel Studio: settings, carousels to render, and the planning so far.
export async function GET(req: NextRequest) {
  const denied = requirePipelineToken(req);
  if (denied) return denied;

  const settings = await db.carouselSettings.findFirst({ where: { tenantId: tenantId() } });
  const open = { tenantId: tenantId(), OR: [{ publishStatus: null }, { publishStatus: { notIn: ["PUBLISHING", "PUBLISHED"] } }] };
  // Background photos are added by Sixtine in Canva: nothing to search for.
  const needPhoto: unknown[] = [];
  // Ready for the Canva template: new, or the text/photo changed.
  const needCanva = await db.carousel.findMany({
    where: {
      AND: [
        open,
        {
          OR: [
            // "Maak in Canva" clicked in the app: fill the Canva template.
            { source: "AI", status: "CANVA_REQUESTED" },
            // "Slides ophalen uit Canva": export her finished design.
            { source: "AI", status: "CANVA_EXPORT" },
            // A finished Canva design (link pasted in the app): only export the pages.
            { source: "CANVA_LINK", OR: [{ status: "DRAFT" }, { renderRequestedAt: { not: null } }] },
          ],
        },
      ],
    },
    orderBy: { scheduledAt: "asc" },
    take: 20,
  });
  // (only once the slides exist: the caption is written from them)
  // "Carousel uit eigen tekst": write the slides from Sixtine's text.
  const needWriting = await db.carousel.findMany({ where: { ...open, status: "WRITING" }, take: 5 });
  const needCaption = await db.carousel.findMany({
    where: { AND: [open, { captionRequestedAt: { not: null } }, { OR: [{ imageUrls: { not: Prisma.DbNull } }, { source: "AI" }] }] },
    take: 10,
  });
  const planned = await db.carousel.findMany({
    where: { tenantId: tenantId(), scheduledAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } },
    orderBy: { scheduledAt: "asc" },
    select: { id: true, title: true, topic: true, scheduledAt: true, publishStatus: true },
  });
  return NextResponse.json({
    settings: settings
      ? { ...settings, theme: { ...DEFAULT_THEME, ...((settings.theme as object | null) ?? {}) } }
      : { briefing: null, topics: null, theme: DEFAULT_THEME, perWeek: 7, postTime: "07:00", autoPublish: false, enabled: true, generateRequestedAt: null },
    needPhoto,
    needWriting,
    needCanva,
    needCaption,
    planned,
  });
}

const slideSchema = z.object({
  type: z.enum(["hook", "body", "cta", "proof"]),
  title: z.string().max(300).optional(),
  kicker: z.string().max(300).optional(),
  text: z.string().max(1200).optional(),
  keyword: z.string().max(60).optional(),
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  topic: z.string().max(300).optional(),
  slides: z.array(slideSchema).min(2).max(10),
  caption: z.string().max(2200),
  photoUrl: z.string().url().nullish(),
  photoQuery: z.string().max(200).nullish(),
  scheduledAt: z.string().datetime(),
  autoPublish: z.boolean().default(false),
});

// New carousel written by Claude on the Mac (the slides are rendered next).
export async function POST(req: NextRequest) {
  const denied = requirePipelineToken(req);
  if (denied) return denied;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const { autoPublish, scheduledAt, slides, ...rest } = parsed.data;
  const carousel = await db.carousel.create({
    data: {
      ...rest,
      slides: slides as Prisma.InputJsonValue,
      tenantId: tenantId(),
      scheduledAt: new Date(scheduledAt),
      // Auto-publish: approved and scheduled as soon as the slides are rendered.
      publishStatus: autoPublish ? "SCHEDULED" : null,
      status: "DRAFT",
    },
  });
  // A requested batch has been handled.
  await db.carouselSettings.updateMany({ where: { tenantId: tenantId() }, data: { generateRequestedAt: null } });
  return NextResponse.json({ carousel });
}
