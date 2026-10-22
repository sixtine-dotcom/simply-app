import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePipelineToken } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  imageUrls: z.array(z.string().url()).optional(),
  photoUrl: z.string().url().nullish(),
  rendered: z.boolean().optional(),
  canvaDesignId: z.string().max(40).optional(),
  caption: z.string().max(2200).optional(),
  failed: z.string().max(4000).optional(),
  // Writing the caption failed: show it, but the carousel itself is fine.
  captionFailed: z.string().max(4000).optional(),
  // The Canva template was filled (Sixtine finishes it in Canva).
  inCanva: z.boolean().optional(),
  // Slides written from Sixtine's own text: ready for her text review.
  written: z
    .object({
      title: z.string().max(200),
      topic: z.string().max(300).optional(),
      slides: z.array(z.object({ type: z.enum(["hook", "body", "cta"]), title: z.string().optional(), text: z.string().optional(), keyword: z.string().optional() })).min(2).max(10),
      caption: z.string().max(2200),
    })
    .optional(),
});

// The Mac reports rendered slides (or a failure).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requirePipelineToken(req);
  if (denied) return denied;
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const current = await db.carousel.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Carousel niet gevonden" }, { status: 404 });
  const { imageUrls, photoUrl, rendered, canvaDesignId, caption, failed, captionFailed, inCanva, written } = parsed.data;

  const data: Prisma.CarouselUpdateInput = {};
  if (photoUrl !== undefined) data.photoUrl = photoUrl;
  if (imageUrls) data.imageUrls = imageUrls;
  if (canvaDesignId) data.canvaDesignId = canvaDesignId;
  if (caption !== undefined) {
    data.caption = caption;
    data.captionRequestedAt = null;
    data.captionFeedback = null;
  }
  if (rendered) {
    data.renderedAt = new Date();
    data.renderRequestedAt = null;
    data.errorMessage = null;
    // Auto-publish carousels (publishStatus already SCHEDULED) are approved straight away.
    if (["DRAFT", "FAILED", "CANVA_EXPORT", "IN_CANVA"].includes(current.status)) data.status = current.publishStatus === "SCHEDULED" ? "APPROVED" : "READY";
  }
  if (written) {
    // Generic titles ("Carousel uit eigen tekst", "Uit video: …") get the carousel's own title.
    data.title = current.title === "Carousel uit eigen tekst" || current.title.startsWith("Uit video") ? written.title : current.title;
    data.topic = written.topic ?? null;
    data.slides = written.slides as Prisma.InputJsonValue;
    data.caption = written.caption;
    data.status = "DRAFT";
    data.errorMessage = null;
  }
  if (inCanva) {
    data.status = "IN_CANVA";
    data.renderRequestedAt = null;
    data.errorMessage = null;
  }
  if (captionFailed) {
    data.errorMessage = captionFailed;
    data.captionRequestedAt = null;
  }
  if (caption !== undefined) data.errorMessage = null;
  if (failed && (current.status === "CANVA_REQUESTED" || current.status === "CANVA_EXPORT")) {
    // Canva failed: keep the text/design, show why, let her try again.
    data.status = current.status === "CANVA_EXPORT" ? "IN_CANVA" : "TEXT_APPROVED";
    data.errorMessage = failed;
  } else if (failed) {
    data.status = "FAILED";
    data.errorMessage = failed;
    data.renderRequestedAt = null;
    data.captionRequestedAt = null;
  }
  const carousel = await db.carousel.update({ where: { id }, data });
  return NextResponse.json({ carousel });
}
