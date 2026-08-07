import { NextRequest, NextResponse } from "next/server";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { postId } = await params;

    const existingPost = await db.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        spaceId: true,
        isPinned: true,
      },
    });

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const updatedPost = await db.post.update({
      where: { id: postId },
      data: {
        isPinned: !existingPost.isPinned,
      },
      select: {
        id: true,
        isPinned: true,
        spaceId: true,
      },
    });

    await createAuditLog("post.pin_toggled", user.id, {
      postId: updatedPost.id,
      spaceId: updatedPost.spaceId,
      isPinned: updatedPost.isPinned,
    });

    return NextResponse.json({
      success: true,
      post: updatedPost,
    });
  } catch (error) {
    console.error("Toggle post pin error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
