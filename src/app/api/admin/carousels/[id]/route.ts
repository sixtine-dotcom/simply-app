import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireVideoAdmin } from "@/lib/video-studio";
import { startCarouselCanvaExport } from "@/lib/canva-export";

export const dynamic = "force-dynamic";

async function findCarousel(id: string, tenantId: string | null | undefined) {
  return db.carousel.findFirst({ where: { id, tenantId: tenantId ?? null } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { id } = await params;
  const carousel = await findCarousel(id, user.tenantId);
  if (!carousel) return NextResponse.json({ error: "Carousel niet gevonden" }, { status: 404 });
  return NextResponse.json({ carousel });
}

const slideSchema = z.object({
  type: z.enum(["hook", "body", "cta", "proof"]),
  title: z.string().max(300).optional(),
  kicker: z.string().max(300).optional(),
  text: z.string().max(1200).optional(),
  keyword: z.string().max(60).optional(),
});

const patchSchema = z.discriminatedUnion("action", [
  // Text changes: the Mac renders the slides again.
  z.object({
    action: z.literal("save"),
    title: z.string().trim().min(1).max(200).optional(),
    slides: z.array(slideSchema).min(2).max(10).optional(),
    caption: z.string().max(2200).optional(),
  }),
  // Another background photo (optionally with a search term).
  z.object({ action: z.literal("new-photo"), query: z.string().trim().max(120).optional() }),
  // Own photo (uploaded in the app) as background.
  z.object({ action: z.literal("set-photo"), photoUrl: z.string().url() }),
  // Uploaded carousels: new order of the slides (or slides removed).
  z.object({ action: z.literal("reorder"), imageUrls: z.array(z.string().url()).min(2).max(10) }),
  // Canva link: fetch the pages again (after changing the design in Canva).
  z.object({ action: z.literal("refresh-canva") }),
  // The Mac writes a caption from the slides.
  z.object({ action: z.literal("write-caption"), feedback: z.string().trim().max(3000).optional() }),
  // AI carousels: the text is fine → ready to be filled in Canva.
  z.object({ action: z.literal("approve-text") }),
  z.object({ action: z.literal("unapprove-text") }),
  // Explicit permission: make this carousel in the Canva template now.
  z.object({ action: z.literal("make-canva") }),
  // Downloaded from Canva and dropped in the app: instant, no Canva task needed.
  z.object({ action: z.literal("set-images"), imageUrls: z.array(z.string().url()).min(2, "Minstens 2 slides").max(10, "Maximaal 10 slides") }),
  // Finished in Canva: fetch the slides into the app (needed to schedule and post).
  z.object({ action: z.literal("fetch-canva") }),
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("unapprove") }),
  z.object({ action: z.literal("reschedule"), scheduledAt: z.string().datetime() }),
]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { id } = await params;
  const carousel = await findCarousel(id, user.tenantId);
  if (!carousel) return NextResponse.json({ error: "Carousel niet gevonden" }, { status: 404 });
  if (carousel.publishStatus === "PUBLISHING" || carousel.publishStatus === "PUBLISHED") {
    return NextResponse.json({ error: "Deze carousel is al gepost" }, { status: 409 });
  }
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ongeldige actie" }, { status: 400 });
  const input = parsed.data;

  let data: Prisma.CarouselUpdateInput = {};
  if (input.action === "save") {
    data = {
      ...(input.title ? { title: input.title } : {}),
      ...(input.caption !== undefined ? { caption: input.caption } : {}),
      ...(input.slides ? { slides: input.slides as Prisma.InputJsonValue } : {}),
    };
  } else if (input.action === "new-photo") {
    data = { photoUrl: null, ...(input.query ? { photoQuery: input.query } : {}), renderRequestedAt: new Date() };
  } else if (input.action === "set-photo") {
    data = { photoUrl: input.photoUrl, renderRequestedAt: new Date() };
  } else if (input.action === "reorder") {
    data = { imageUrls: input.imageUrls };
  } else if (input.action === "refresh-canva") {
    data = { renderRequestedAt: new Date() };
  } else if (input.action === "write-caption") {
    if (!carousel.imageUrls && carousel.source === "UPLOAD") return NextResponse.json({ error: "Upload eerst de slides" }, { status: 400 });
    data = { captionRequestedAt: new Date(), captionFeedback: input.feedback || null };
  } else if (input.action === "approve-text") {
    data = { status: "TEXT_APPROVED", errorMessage: null };
  } else if (input.action === "make-canva") {
    if (carousel.status !== "TEXT_APPROVED" && carousel.status !== "IN_CANVA") {
      return NextResponse.json({ error: "Keur eerst de tekst goed" }, { status: 400 });
    }
    data = { status: "CANVA_REQUESTED", errorMessage: null };
  } else if (input.action === "set-images") {
    data = { imageUrls: input.imageUrls, renderedAt: new Date(), renderRequestedAt: null, errorMessage: null, ...(carousel.status === "APPROVED" ? {} : { status: "READY" }) };
  } else if (input.action === "fetch-canva") {
    if (!carousel.canvaDesignId) return NextResponse.json({ error: "Maak de carousel eerst in Canva" }, { status: 400 });
    data = { status: "CANVA_EXPORT", errorMessage: null };
  } else if (input.action === "unapprove-text") {
    data = { status: "DRAFT" };
  } else if (input.action === "approve") {
    if (!carousel.imageUrls) return NextResponse.json({ error: "Wacht tot de slides klaar zijn" }, { status: 400 });
    if (!carousel.caption?.trim()) return NextResponse.json({ error: "Er is nog geen caption" }, { status: 400 });
    data = { status: "APPROVED", publishStatus: carousel.scheduledAt ? "SCHEDULED" : null, publishError: null };
  } else if (input.action === "unapprove") {
    data = { status: "READY", publishStatus: null };
  } else if (input.action === "reschedule") {
    const at = new Date(input.scheduledAt);
    if (at.getTime() < Date.now() - 60_000) return NextResponse.json({ error: "Kies een moment in de toekomst" }, { status: 400 });
    data = { scheduledAt: at, ...(carousel.status === "APPROVED" ? { publishStatus: "SCHEDULED", publishError: null } : {}) };
  }
  const updated = await db.carousel.update({ where: { id }, data });
  // Fetch from Canva right away in the app (Canva connected); otherwise the Mac/Claude task does it.
  if ((input.action === "fetch-canva" || input.action === "refresh-canva") && updated.canvaDesignId) {
    await startCarouselCanvaExport(updated.id, updated.tenantId, updated.canvaDesignId);
  }
  return NextResponse.json({ carousel: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { id } = await params;
  const carousel = await findCarousel(id, user.tenantId);
  if (!carousel) return NextResponse.json({ error: "Carousel niet gevonden" }, { status: 404 });
  await db.carousel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
