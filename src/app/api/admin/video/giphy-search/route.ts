import { NextRequest, NextResponse } from "next/server";
import { requireVideoAdmin } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

type GiphyImage = { url?: string; mp4?: string; webp?: string; width?: string; height?: string };
type GiphyItem = { id: string; title: string; images: Record<string, GiphyImage> };

// GIPHY search for the animation picker: transparent stickers or GIF clips. "Powered by GIPHY" is shown in the picker.
export async function GET(req: NextRequest) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const key = process.env.GIPHY_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "Voeg eerst een gratis GIPHY API-key toe (GIPHY_API_KEY)" }, { status: 503 });
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const type = req.nextUrl.searchParams.get("type") === "gifs" ? "gifs" : "stickers";
  if (!q) return NextResponse.json({ results: [] });

  const url = new URL(`https://api.giphy.com/v1/${type}/search`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "36");
  url.searchParams.set("rating", "g");
  url.searchParams.set("lang", "nl");
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return NextResponse.json({ error: "GIPHY is nu niet bereikbaar" }, { status: 502 });
  const data = await res.json();
  const results = ((data.data ?? []) as GiphyItem[])
    .map((item) => {
      const original = item.images?.original ?? {};
      const preview = item.images?.fixed_width?.webp ?? item.images?.fixed_width?.url ?? original.url;
      if (!original.url) return null;
      return {
        id: item.id,
        title: item.title || q,
        // Stickers keep their transparency as GIF; GIF clips play smoother as MP4.
        src: type === "stickers" ? original.url : original.mp4 ?? original.url,
        kind: type === "stickers" ? "image" : "video",
        preview,
        width: Number(original.width) || null,
        height: Number(original.height) || null,
      };
    })
    .filter(Boolean);
  return NextResponse.json({ results });
}
