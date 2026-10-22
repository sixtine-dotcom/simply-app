import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePipelineToken } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

// The animation library, so Claude can pick from it.
export async function GET(req: NextRequest) {
  const denied = requirePipelineToken(req);
  if (denied) return denied;
  const tenantId = process.env.VIDEO_PIPELINE_TENANT_ID?.trim() || null;
  const animations = await db.videoAnimation.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, kind: true, src: true, tags: true, previewUrl: true },
  });
  return NextResponse.json({ animations });
}
