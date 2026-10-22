import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireVideoAdmin, videoProjectScope } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

// Video Studio reels that are scheduled or published, for the content planner's calendar.
export async function GET() {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const projects = await db.videoProject.findMany({
    where: { ...videoProjectScope(user.tenantId), scheduledAt: { not: null }, publishStatus: { not: null } },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      caption: true,
      publishStatus: true,
      publishHistory: true,
      versions: { orderBy: { number: "desc" }, take: 1, select: { posterUrl: true } },
    },
  });
  // Earlier posts of a reel (before it was posted again) show up in the calendar as published too.
  type Past = { publishedAt: string | null; caption: string | null };
  const reels = projects.flatMap(({ versions, publishHistory, ...p }) => {
    const posterUrl = versions[0]?.posterUrl ?? null;
    const past = ((publishHistory as Past[] | null) ?? [])
      .filter((h) => h.publishedAt)
      .map((h, i) => ({ ...p, id: p.id, key: `${p.id}-${i}`, scheduledAt: h.publishedAt, caption: h.caption, publishStatus: "PUBLISHED", posterUrl }));
    return [...past, { ...p, key: p.id, posterUrl }];
  });
  return NextResponse.json({ reels });
}
