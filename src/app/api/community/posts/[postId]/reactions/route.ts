import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessSpace, togglePostReaction } from "@/lib/community";
import { isAllowedReaction } from "@/lib/community-reactions";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (!isAllowedReaction(body?.emoji)) {
      return NextResponse.json({ error: "Ongeldige emoji" }, { status: 400 });
    }

    const post = await db.post.findUnique({ where: { id: postId }, select: { spaceId: true } });
    if (!post) {
      return NextResponse.json({ error: "Post niet gevonden" }, { status: 404 });
    }

    if (!(await canUserAccessSpace(user.id, post.spaceId))) {
      return NextResponse.json({ error: "Geen toegang tot deze space" }, { status: 403 });
    }

    return NextResponse.json(await togglePostReaction(postId, user.id, body.emoji));
  } catch (error) {
    console.error("Toggle post reaction error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
