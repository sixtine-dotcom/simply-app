import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessSpace, toggleCommentReaction } from "@/lib/community";
import { isAllowedReaction } from "@/lib/community-reactions";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (!isAllowedReaction(body?.emoji)) {
      return NextResponse.json({ error: "Ongeldige emoji" }, { status: 400 });
    }

    const comment = await db.comment.findUnique({
      where: { id: commentId },
      select: { post: { select: { spaceId: true } } },
    });
    if (!comment) {
      return NextResponse.json({ error: "Reactie niet gevonden" }, { status: 404 });
    }

    if (!(await canUserAccessSpace(user.id, comment.post.spaceId))) {
      return NextResponse.json({ error: "Geen toegang tot deze space" }, { status: 403 });
    }

    return NextResponse.json(await toggleCommentReaction(commentId, user.id, body.emoji));
  } catch (error) {
    console.error("Toggle comment reaction error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
