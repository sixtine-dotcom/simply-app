import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";
import { requireVideoAdmin } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

// Own photos for carousel backgrounds and testimonial screenshots for the proof slide.
export async function POST(req: NextRequest) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    return NextResponse.json({ error: "Kies een JPG-, PNG- of WebP-afbeelding" }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "Afbeelding is groter dan 15 MB" }, { status: 400 });
  const safeName = file.name.replace(/[^\w.-]+/g, "-").slice(-80);
  const { url } = await uploadToR2({
    key: `carousel-studio/${user.tenantId ?? "default"}/${Date.now()}-${safeName}`,
    body: Buffer.from(await file.arrayBuffer()),
    contentType: file.type,
  });
  return NextResponse.json({ url });
}
