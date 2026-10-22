import { NextRequest, NextResponse } from "next/server";
import { requireVideoAdmin } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

const QUERY = `query Search($q: String!, $first: Int!) {
  searchPublicAnimations(query: $q, first: $first) {
    edges { node { id name jsonUrl gifUrl imageUrl } }
  }
}`;

// Searches free animations on LottieFiles (public API, no account needed).
export async function GET(req: NextRequest) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });
  try {
    const res = await fetch("https://graphql.lottiefiles.com/2022-08", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { q, first: 24 } }),
      cache: "no-store",
    });
    const data = await res.json();
    type Node = { id: number; name: string; jsonUrl: string | null; gifUrl: string | null; imageUrl: string | null };
    const edges: Array<{ node: Node }> = data?.data?.searchPublicAnimations?.edges ?? [];
    const results = edges
      .map(({ node }) => node)
      .filter((n) => n.jsonUrl)
      .map((n) => ({ id: String(n.id), name: n.name && n.name !== "none" ? n.name : q, src: n.jsonUrl!, previewUrl: n.gifUrl ?? n.imageUrl }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "LottieFiles is nu niet bereikbaar" }, { status: 502 });
  }
}
