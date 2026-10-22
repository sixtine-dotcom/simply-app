import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireVideoAdmin } from "@/lib/video-studio";
import { startCarouselCanvaExport } from "@/lib/canva-export";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const carousels = await db.carousel.findMany({
    where: { tenantId: user.tenantId ?? null, OR: [{ scheduledAt: null }, { scheduledAt: { gte: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) } }] },
    orderBy: { scheduledAt: "asc" },
  });
  return NextResponse.json({ carousels });
}

const uploadSchema = z.object({
  action: z.literal("upload"),
  title: z.string().trim().min(1, "Geef de carousel een titel").max(200),
  imageUrls: z.array(z.string().url()).min(2, "Een carousel heeft minstens 2 slides").max(10, "Instagram laat maximaal 10 slides toe"),
  caption: z.string().max(2200).optional(),
  // true = the Mac writes the caption from the slides, in her tone of voice.
  writeCaption: z.boolean().default(false),
  scheduledAt: z.string().datetime().nullish(),
});

const canvaSchema = z.object({
  action: z.literal("canva-link"),
  title: z.string().trim().max(200).optional(),
  canvaUrl: z.string().trim().url("Plak de link van je Canva-ontwerp"),
  caption: z.string().max(2200).optional(),
  writeCaption: z.boolean().default(false),
  scheduledAt: z.string().datetime().nullish(),
});

const fromTextSchema = z.object({
  action: z.literal("from-text"),
  title: z.string().trim().max(200).optional(),
  text: z.string().trim().min(20, "Plak je tekst of beschrijf het onderwerp (minstens een paar zinnen)").max(20000),
  briefing: z.string().trim().max(4000).optional(),
  scheduledAt: z.string().datetime().nullish(),
});

// POST without body: "Maak nu een week" (the Mac writes the next batch within a minute).
// POST { action: "upload" }: an existing carousel (images) to schedule.
export async function POST(req: Request) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const body = await req.json().catch(() => null);

  // Stop "Maak nu een week" (also when the Mac is already writing: it then discards the result).
  if (body?.action === "cancel-generate") {
    await db.carouselSettings.updateMany({ where: { tenantId: user.tenantId ?? null }, data: { generateRequestedAt: null } });
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "from-text") {
    const parsed = fromTextSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    const { title, text, briefing, scheduledAt } = parsed.data;
    const carousel = await db.carousel.create({
      data: {
        tenantId: user.tenantId ?? null,
        source: "AI",
        title: title || "Carousel uit eigen tekst",
        slides: [] as Prisma.InputJsonValue,
        brief: `${text}${briefing ? `\n\n--- Briefing ---\n${briefing}` : ""}`,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: "WRITING",
      },
    });
    return NextResponse.json({ carousel });
  }

  if (body?.action === "canva-link") {
    const parsed = canvaSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    const { title, canvaUrl, caption, writeCaption, scheduledAt } = parsed.data;
    if (!/canva\.(com|link)/i.test(canvaUrl)) return NextResponse.json({ error: "Dit is geen Canva-link" }, { status: 400 });
    // "…/design/DAH…/…" → design id; short links (canva.link, /d/…) are resolved by the Canva task.
    const designId = /\/design\/(D[A-Za-z0-9_-]{10})/.exec(canvaUrl)?.[1] ?? canvaUrl;
    const carousel = await db.carousel.create({
      data: {
        tenantId: user.tenantId ?? null,
        source: "CANVA_LINK",
        title: title || "Carousel uit Canva",
        slides: [] as Prisma.InputJsonValue,
        canvaDesignId: designId,
        caption: caption?.trim() || null,
        captionRequestedAt: writeCaption ? new Date() : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: "DRAFT",
      },
    });
    // Canva connected: fetch the pages right away (seconds) instead of waiting for the Mac/Claude task.
    await startCarouselCanvaExport(carousel.id, carousel.tenantId, designId);
    return NextResponse.json({ carousel });
  }

  if (body?.action === "upload") {
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    const { title, imageUrls, caption, writeCaption, scheduledAt } = parsed.data;
    const carousel = await db.carousel.create({
      data: {
        tenantId: user.tenantId ?? null,
        source: "UPLOAD",
        title,
        slides: [] as Prisma.InputJsonValue,
        imageUrls,
        renderedAt: new Date(),
        caption: caption?.trim() || null,
        captionRequestedAt: writeCaption ? new Date() : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: "READY",
      },
    });
    return NextResponse.json({ carousel });
  }

  const existing = await db.carouselSettings.findFirst({ where: { tenantId: user.tenantId ?? null } });
  if (existing) await db.carouselSettings.update({ where: { id: existing.id }, data: { generateRequestedAt: new Date() } });
  else await db.carouselSettings.create({ data: { tenantId: user.tenantId ?? null, generateRequestedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
