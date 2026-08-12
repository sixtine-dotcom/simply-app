import { NextRequest, NextResponse } from "next/server";
import { sendCampaignBatch } from "@/lib/email-campaigns";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.nextUrl.searchParams.get("secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await sendCampaignBatch(4)) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Verzenden mislukt" }, { status: 500 });
  }
}
