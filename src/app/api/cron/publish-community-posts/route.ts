export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { publishDueScheduledCommunityPosts } from "@/lib/scheduled-community-posts";

export async function GET(request: NextRequest) {
  try {
    const secret =
      request.nextUrl.searchParams.get("secret") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const expected = process.env.CRON_SECRET;
    if (expected && secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await publishDueScheduledCommunityPosts();

    return NextResponse.json({
      ok: true,
      ...result,
      message: `${result.published} communitypost(s) gepubliceerd, ${result.failed} mislukt.`,
    });
  } catch (error) {
    console.error("Publish community posts cron error:", error);
    return NextResponse.json(
      {
        error: "Publiceren mislukt",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
