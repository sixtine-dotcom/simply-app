import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { DEFAULT_VIDEO_STEPS, VIDEO_MODES, requireVideoAdmin, slugifyVideoTitle } from "@/lib/video-studio";

const schema = z.object({
  title: z.string().trim().min(2, "Geef de video een titel").max(200),
  mode: z.enum(VIDEO_MODES).default("SOCIAL"),
  briefing: z.string().trim().max(4000).optional(),
  cutByVisuals: z.boolean().optional(),
  colorMatch: z.number().min(0).max(1).nullish(),
});

// Creating a project here makes the Mac pipeline create the matching folder.
export async function POST(req: NextRequest) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  let slug = slugifyVideoTitle(parsed.data.title);
  if (await db.videoProject.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const project = await db.videoProject.create({
    data: {
      slug,
      title: parsed.data.title,
      mode: parsed.data.mode,
      briefing: parsed.data.briefing || null,
      cutByVisuals: parsed.data.cutByVisuals ?? false,
      colorMatch: parsed.data.colorMatch ?? null,
      tenantId: user.tenantId ?? null,
      steps: DEFAULT_VIDEO_STEPS,
    },
  });
  return NextResponse.json({ project });
}
