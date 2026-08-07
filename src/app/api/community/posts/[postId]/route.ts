import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { deletePost, updatePost } from "@/lib/community";

const updatePostSchema = z.object({
  title: z.string().max(160).optional().or(z.literal("")),
  content: z.string().min(1, "Post content is required").max(10000),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const data = updatePostSchema.parse(body);

    await updatePost(
      postId,
      user.id,
      data.title?.trim() ? data.title.trim() : null,
      data.content.trim()
    );

    await createAuditLog("post.updated", user.id, { postId });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    if (error instanceof Error) {
      const status = error.message === "Post not found." ? 404 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await deletePost(postId, user.id);
    await createAuditLog("post.deleted", user.id, { postId });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message === "Post not found." ? 404 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
