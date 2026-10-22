import { NextRequest, NextResponse } from "next/server";
import { requirePipelineToken } from "@/lib/video-studio";
import { advanceScheduledCarousels, advanceScheduledReels, getInstagramConnection } from "@/lib/instagram-publish";

import { advanceScheduledSocialPosts } from "@/lib/scheduled-social-posts";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Called every minute by the Mac pipeline (and later by an external cron) to publish scheduled reels.
export async function POST(req: NextRequest) {
  const denied = requirePipelineToken(req);
  if (denied) return denied;
  // Keeps the Instagram token alive: it is refreshed automatically when it has less than a week left.
  await getInstagramConnection(process.env.VIDEO_PIPELINE_TENANT_ID?.trim() || null).catch(() => null);
  const reels = await advanceScheduledReels();
  const carousels = await advanceScheduledCarousels();
  const social = await advanceScheduledSocialPosts();
  return NextResponse.json({ results: [...social, ...reels, ...carousels.map((r) => ({ ...r, kind: "carousel" }))] });
}
