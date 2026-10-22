import { NextRequest, NextResponse } from "next/server";
import { requireVideoAdmin } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

type UnsplashPhoto = {
  id: string;
  alt_description: string | null;
  urls: { raw: string; small: string };
  links: { download_location: string };
  user: { name: string };
};

// Unsplash photo search for the video editor (full-screen photo cutaways). Needs UNSPLASH_ACCESS_KEY.
export async function GET(req: NextRequest) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) return NextResponse.json({ error: "Voeg eerst je Unsplash Access Key toe (UNSPLASH_ACCESS_KEY)" }, { status: 503 });
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", q);
  url.searchParams.set("per_page", "30");
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("content_filter", "high");
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" }, cache: "no-store" });
  if (!res.ok) return NextResponse.json({ error: "Unsplash is nu niet bereikbaar" }, { status: 502 });
  const data = await res.json();
  const results = ((data.results ?? []) as UnsplashPhoto[]).map((p) => ({
    id: p.id,
    title: p.alt_description || q,
    // Vertical 1080x1920 crop for the video.
    src: `${p.urls.raw}&w=1080&h=1920&fit=crop&fm=jpg&q=85`,
    preview: p.urls.small,
    author: p.user?.name ?? "",
    downloadLocation: p.links.download_location,
  }));
  return NextResponse.json({ results });
}

// Unsplash asks apps to register a "download" when a photo is used.
export async function POST(req: NextRequest) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  const body = await req.json().catch(() => ({}));
  const location = typeof body.downloadLocation === "string" ? body.downloadLocation : "";
  if (key && location.startsWith("https://api.unsplash.com/")) {
    await fetch(location, { headers: { Authorization: `Client-ID ${key}` } }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
