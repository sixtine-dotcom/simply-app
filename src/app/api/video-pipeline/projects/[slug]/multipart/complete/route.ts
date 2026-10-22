import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { completeR2MultipartUpload } from "@/lib/r2";
import { requirePipelineToken } from "@/lib/video-studio";

const schema = z.object({
  key: z.string().startsWith("video-studio/"),
  uploadId: z.string().min(1),
  parts: z.array(z.object({ PartNumber: z.number().int().positive(), ETag: z.string().min(1) })).min(1),
});

export async function POST(req: NextRequest) {
  const denied = requirePipelineToken(req);
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  return NextResponse.json(await completeR2MultipartUpload(parsed.data));
}
