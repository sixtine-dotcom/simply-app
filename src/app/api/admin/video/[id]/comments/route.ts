import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { VIDEO_COMMENT_KINDS, findVideoProjectForAdmin, requireVideoAdmin } from "@/lib/video-studio";

const schema = z.object({
  versionId: z.string().nullish(),
  kind: z.enum(VIDEO_COMMENT_KINDS).default("COMMENT"),
  startSec: z.number().nonnegative(),
  endSec: z.number().nonnegative().nullish(),
  selectedText: z.string().max(4000).nullish(),
  body: z.string().trim().min(1, "Schrijf een opmerking").max(4000),
  markers: z
    .array(z.object({ label: z.string().max(3), x: z.number().min(0).max(1), y: z.number().min(0).max(1) }))
    .max(12)
    .default([]),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { id } = await params;
  if (!(await findVideoProjectForAdmin(id, user.tenantId))) {
    return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const comment = await db.videoComment.create({
    data: {
      ...parsed.data,
      projectId: id,
      authorId: user.id,
      authorName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
    },
  });
  return NextResponse.json({ comment });
}
