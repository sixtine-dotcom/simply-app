import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePipelineToken } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

// Tone-of-voice examples for the pipeline's caption writer.
export async function GET(req: NextRequest) {
  const denied = requirePipelineToken(req);
  if (denied) return denied;
  const tenantId = process.env.VIDEO_PIPELINE_TENANT_ID?.trim() || null;
  const settings = tenantId ? await db.videoStudioSettings.findUnique({ where: { tenantId } }) : null;
  return NextResponse.json({
    captionExamples: settings?.captionExamples ?? "",
    captionGuidelines: settings?.captionGuidelines ?? "",
    editingGuidelines: settings?.editingGuidelines ?? "",
  });
}
