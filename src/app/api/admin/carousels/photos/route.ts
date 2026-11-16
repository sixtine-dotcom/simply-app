import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireVideoAdmin } from "@/lib/video-studio";
import { uploadToR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const photos = await db.carouselBrandPhoto.findMany({
    where: { tenantId: user.tenantId ?? null }, orderBy: { createdAt: "desc" },
    select: { id: true, name: true, url: true, cutoutUrl: true },
  });
  return NextResponse.json({ photos });
}

export async function POST(req: NextRequest) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Geen foto ontvangen" }, { status: 400 });
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    return NextResponse.json({ error: "Kies een JPG-, PNG- of WebP-foto" }, { status: 400 });
  }
  if (!file.size || file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "Kies een foto van maximaal 15 MB" }, { status: 400 });
  try {
    const safeName = file.name.replace(/[^\w.-]+/g, "-").slice(-80);
    const { url } = await uploadToR2({
      key: `carousel-studio/${user.tenantId ?? "default"}/brand-photos/${randomUUID()}-${safeName}`,
      body: Buffer.from(await file.arrayBuffer()), contentType: file.type,
    });
    const photo = await db.carouselBrandPhoto.create({ data: { tenantId: user.tenantId ?? null, name: file.name.slice(0, 200), url } });
    return NextResponse.json({ photo });
  } catch (error) {
    console.error("Brand photo upload failed", error);
    return NextResponse.json({ error: "Je foto kon niet worden opgeslagen. Probeer opnieuw." }, { status: 503 });
  }
}
