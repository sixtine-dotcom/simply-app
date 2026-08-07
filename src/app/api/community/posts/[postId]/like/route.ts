import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canUserAccessSpace, togglePostLike } from "@/lib/community";
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

    const post = await db.post.findUnique({
      where: { id: postId },
      select: { spaceId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post niet gevonden" }, { status: 404 });
    }

    const hasAccess = await canUserAccessSpace(user.id, post.spaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Geen toegang tot deze space" }, { status: 403 });
    }

    const result = await togglePostLike(postId, user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Toggle like error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
