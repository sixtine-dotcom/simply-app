import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireVideoAdmin } from "@/lib/video-studio";
import { renderInputForCarousel, renderSlidePng } from "@/lib/carousel-render";

export const dynamic = "force-dynamic";

// Live preview of one slide drawn in the app: ?slide=0&template=foto-editorial (PNG, not stored).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { id } = await params;
  const carousel = await db.carousel.findFirst({ where: { id, tenantId: user.tenantId ?? null }, select: { tenantId: true, slides: true, photoUrl: true } });
  if (!carousel) return NextResponse.json({ error: "Carousel niet gevonden" }, { status: 404 });
  const input = await renderInputForCarousel(carousel, req.nextUrl.searchParams.get("template"));
  const index = Number(req.nextUrl.searchParams.get("slide") ?? 0);
  if (!Number.isInteger(index) || index < 0 || index >= input.slides.length) return NextResponse.json({ error: "Slide bestaat niet" }, { status: 400 });
  try {
    const png = await renderSlidePng(input, index);
    return new NextResponse(png, { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Carousel preview failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Voorbeeld maken mislukt" }, { status: 500 });
  }
}
