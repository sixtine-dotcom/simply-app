import { NextRequest, NextResponse } from "next/server";
import { requireVideoAdmin } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

// Free stock B-roll from Mixkit (free licence, commercial use allowed, no attribution). Mixkit has no API,
// so this reads its public search page and returns the clips with their HD file.
export async function GET(req: NextRequest) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  if (!q) return NextResponse.json({ results: [] });
  const slug = q.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const res = await fetch(`https://mixkit.co/free-stock-video/${slug}/`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  if (res.status === 404) return NextResponse.json({ results: [] });
  if (!res.ok) return NextResponse.json({ error: "Mixkit is nu niet bereikbaar" }, { status: 502 });
  const html = await res.text();
  const ids = Array.from(new Set(Array.from(html.matchAll(/assets\.mixkit\.co\/videos\/(\d+)\/\1-360\.mp4/g)).map((m) => m[1])));
  const results = ids.slice(0, 24).map((id) => ({
    id: `mixkit-${id}`,
    src: `https://assets.mixkit.co/videos/${id}/${id}-1080.mp4`,
    preview: `https://assets.mixkit.co/videos/${id}/${id}-thumb-360-0.jpg`,
    previewVideo: `https://assets.mixkit.co/videos/${id}/${id}-360.mp4`,
  }));
  return NextResponse.json({ results });
}
