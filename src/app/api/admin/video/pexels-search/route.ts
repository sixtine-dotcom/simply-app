import { NextRequest, NextResponse } from "next/server";
import { requireVideoAdmin } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

type Result = { id: string; src: string; preview: string | null; previewVideo: string; duration: number; credit: string };

// Free stock B-roll for the animation picker: Pixabay (PIXABAY_API_KEY), or Pexels (PEXELS_API_KEY) as fallback.
export async function GET(req: NextRequest) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const portrait = req.nextUrl.searchParams.get("orientation") !== "landscape";
  if (!q) return NextResponse.json({ results: [] });

  const pixabayKey = process.env.PIXABAY_API_KEY?.trim();
  const pexelsKey = process.env.PEXELS_API_KEY?.trim();
  if (!pixabayKey && !pexelsKey) {
    return NextResponse.json({ error: "Voeg eerst een gratis Pixabay API-key toe (PIXABAY_API_KEY)" }, { status: 503 });
  }

  let results: Result[] = [];
  if (pixabayKey) {
    const url = new URL("https://pixabay.com/api/videos/");
    url.searchParams.set("key", pixabayKey);
    url.searchParams.set("q", q);
    url.searchParams.set("per_page", "60");
    url.searchParams.set("safesearch", "true");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ error: "Pixabay is nu niet bereikbaar" }, { status: 502 });
    const data = await res.json();
    type File = { url: string; width: number; height: number; thumbnail?: string };
    type Hit = { id: number; duration: number; user?: string; videos: Record<string, File> };
    results = ((data.hits ?? []) as Hit[])
      .map((hit) => {
        const files = Object.values(hit.videos ?? {}).filter((f) => f?.url && f.width && f.height);
        const best = [...files].sort((a, b) => Math.abs(Math.min(a.width, a.height) - 1080) - Math.abs(Math.min(b.width, b.height) - 1080))[0];
        const small = [...files].sort((a, b) => a.width - b.width)[0];
        if (!best) return null;
        return {
          id: `pixabay-${hit.id}`,
          src: best.url,
          preview: hit.videos?.medium?.thumbnail ?? hit.videos?.small?.thumbnail ?? null,
          previewVideo: small?.url ?? best.url,
          duration: hit.duration ?? 0,
          credit: hit.user ?? "Pixabay",
          portrait: best.height > best.width,
        };
      })
      .filter((r): r is Result & { portrait: boolean } => Boolean(r))
      .sort((a, b) => Number(b.portrait === portrait) - Number(a.portrait === portrait))
      .slice(0, 24);
  } else if (pexelsKey) {
    const url = new URL("https://api.pexels.com/videos/search");
    url.searchParams.set("query", q);
    url.searchParams.set("orientation", portrait ? "portrait" : "landscape");
    url.searchParams.set("per_page", "18");
    const res = await fetch(url, { headers: { Authorization: pexelsKey }, cache: "no-store" });
    if (!res.ok) return NextResponse.json({ error: "Pexels is nu niet bereikbaar" }, { status: 502 });
    const data = await res.json();
    type File = { link: string; file_type: string; width: number; height: number };
    type Video = { id: number; image: string; duration: number; user?: { name?: string }; video_files: File[] };
    results = ((data.videos ?? []) as Video[])
      .map((v): Result | null => {
        const files = v.video_files.filter((f) => f.file_type === "video/mp4" && f.width && f.height);
        const best = [...files].sort((a, b) => Math.abs(Math.min(a.width, a.height) - 1080) - Math.abs(Math.min(b.width, b.height) - 1080))[0];
        const small = [...files].sort((a, b) => a.width - b.width)[0];
        return best ? { id: `pexels-${v.id}`, src: best.link, preview: v.image, previewVideo: small?.link ?? best.link, duration: v.duration, credit: v.user?.name ?? "Pexels" } : null;
      })
      .filter((r): r is Result => r !== null);
  }
  return NextResponse.json({ results });
}
