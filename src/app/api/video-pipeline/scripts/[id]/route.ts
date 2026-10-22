import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePipelineToken } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

const schema = z.object({
  written: z
    .object({
      headline: z.string().max(200),
      topic: z.string().max(300).optional(),
      hook: z.string().max(2000),
      credibility: z.string().max(2000),
      value: z.string().max(8000),
      cta: z.string().max(2000),
      hookFormat: z.string().max(300).optional(),
      storyNote: z.string().max(2000).optional(),
    })
    .optional(),
  failed: z.string().max(4000).optional(),
});

// The Mac reports a (re)written script, or a failure.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requirePipelineToken(req);
  if (denied) return denied;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const { written, failed } = parsed.data;
  const script = await db.reelScript.update({
    where: { id },
    data: written
      ? { ...written, status: "DRAFT", feedback: null, errorMessage: null }
      : { status: "DRAFT", errorMessage: failed ?? "Schrijven mislukt" },
  });
  return NextResponse.json({ script });
}
