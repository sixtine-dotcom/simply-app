import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireVideoAdmin } from "@/lib/video-studio";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const animations = await db.videoAnimation.findMany({ where: { tenantId: user.tenantId ?? null }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ animations });
}

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["lottie", "video", "image"]),
  src: z.string().url(),
  previewUrl: z.string().url().nullish(),
  source: z.enum(["lottiefiles", "upload"]),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
});

// Adds an animation to the library (picked from LottieFiles or uploaded, e.g. a Canva export).
export async function POST(req: NextRequest) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const existing = await db.videoAnimation.findFirst({ where: { tenantId: user.tenantId ?? null, src: parsed.data.src } });
  const animation = existing ?? (await db.videoAnimation.create({ data: { ...parsed.data, tenantId: user.tenantId ?? null } }));
  return NextResponse.json({ animation });
}
