import { NextResponse } from "next/server";
import { advanceScheduledSocialPosts } from "@/lib/scheduled-social-posts";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ results: await advanceScheduledSocialPosts() });
}
