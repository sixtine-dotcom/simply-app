import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { uploadToR2 } from "@/lib/r2";
import { requireVideoAdmin } from "@/lib/video-studio";

const ALLOWED_HOSTS = ["assets.mixkit.co", "cdn.pixabay.com", "videos.pexels.com", "player.vimeo.com"];
const MAX_BYTES = 80 * 1024 * 1024;

// Copies a picked stock clip into our own storage (stock sites don't allow permanent hotlinking).
export async function POST(req: NextRequest) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const parsed = z.object({ url: z.string().url() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige link" }, { status: 400 });
  const source = new URL(parsed.data.url);
  if (source.protocol !== "https:" || !ALLOWED_HOSTS.some((h) => source.hostname === h || source.hostname.endsWith(`.${h}`))) {
    return NextResponse.json({ error: "Alleen clips van Mixkit, Pixabay of Pexels" }, { status: 400 });
  }
  const res = await fetch(source, { cache: "no-store" });
  if (!res.ok) return NextResponse.json({ error: "Clip downloaden mislukt" }, { status: 502 });
  const body = Buffer.from(await res.arrayBuffer());
  if (body.length > MAX_BYTES) return NextResponse.json({ error: "Clip is te groot" }, { status: 400 });
  const uploaded = await uploadToR2({ key: `video-studio/broll/${Date.now()}-${randomUUID()}.mp4`, body, contentType: "video/mp4" });
  return NextResponse.json({ url: uploaded.url });
}
