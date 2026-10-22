import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createR2UploadUrl } from "@/lib/r2";
import { requirePipelineToken } from "@/lib/video-studio";

const schema = z.object({
  filename: z.string().trim().min(1).max(200),
  contentType: z.enum(["video/mp4", "video/webm", "image/jpeg", "image/png", "application/json", "text/vtt"]),
});

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
  const upload = await createR2UploadUrl({
    key: `video-studio/${safeSlug}/${Date.now()}-${safeName}`,
    contentType: parsed.data.contentType,
  });
  return NextResponse.json(upload);
}
