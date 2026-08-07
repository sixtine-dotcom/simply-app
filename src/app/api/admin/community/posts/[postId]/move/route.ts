import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const movePostSchema = z.object({
  spaceId: z.string().min(1, "Target space is required"),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { postId } = await params;
    const body = movePostSchema.parse(await request.json());

    const [post, targetSpace] = await Promise.all([
      db.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          spaceId: true,
          content: true,
        },
      }),
      db.space.findUnique({
        where: { id: body.spaceId },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      }),
    ]);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (!targetSpace) {
      return NextResponse.json({ error: "Target space not found" }, { status: 404 });
    }

    if (post.spaceId === targetSpace.id) {
      return NextResponse.json({
        success: true,
        post: {
          id: post.id,
          spaceId: post.spaceId,
        },
        targetSpace,
      });
    }

    const updatedPost = await db.post.update({
      where: { id: post.id },
      data: {
        spaceId: targetSpace.id,
      },
      select: {
        id: true,
        spaceId: true,
      },
    });

    await createAuditLog("post.moved", user.id, {
      postId: post.id,
      fromSpaceId: post.spaceId,
      toSpaceId: targetSpace.id,
      preview: post.content.slice(0, 180),
    });

    return NextResponse.json({
      success: true,
      post: updatedPost,
      targetSpace,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Move post error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
