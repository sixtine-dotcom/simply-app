import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createR2MultipartUpload } from "@/lib/r2";
import { requirePipelineToken } from "@/lib/video-studio";

const schema = z.object({
  filename: z.string().trim().min(1).max(200),
  contentType: z.enum(["video/mp4", "video/webm"]),
  partCount: z.number().int().min(1).max(1000),
});

// Starts a multipart upload for larger pipeline files; returns one presigned URL per part.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const denied = requirePipelineToken(req);
  if (denied) return denied;
  const { slug } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const safeName = parsed.data.filename.replace(/[^\w.-]+/g, "-");
  const safeSlug = slug.replace(/[^\w.-]+/g, "-");
  const upload = await createR2MultipartUpload({
    key: `video-studio/${safeSlug}/${Date.now()}-${safeName}`,
    contentType: parsed.data.contentType,
    partCount: parsed.data.partCount,
  });
  return NextResponse.json(upload);
}
