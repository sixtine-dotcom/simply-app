import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireVideoAdmin, videoProjectScope } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

// Finished Video Studio exports that can be attached to a lesson (or used elsewhere).
export async function GET() {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const videos = await db.videoProject.findMany({
    where: { ...videoProjectScope(user.tenantId), finalUrl: { not: null } },
    orderBy: { approvedAt: "desc" },
    select: {
      id: true,
      title: true,
      mode: true,
      finalUrl: true,
      finalVersion: true,
      finalDurationSec: true,
      approvedAt: true,
      versions: { orderBy: { number: "desc" }, take: 1, select: { posterUrl: true } },
    },
  });
  return NextResponse.json({
    videos: videos.map(({ versions, ...video }) => ({ ...video, posterUrl: versions[0]?.posterUrl ?? null })),
  });
}
