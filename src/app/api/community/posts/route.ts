import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { createPost, canUserPostInSpace } from "@/lib/community";

const createPostSchema = z.object({
  content: z.string().min(1, "Bericht is verplicht").max(10000),
  spaceId: z.string().min(1, "Space is verplicht"),
  attachments: z
    .array(
      z.object({
        url: z.string(),
        type: z.enum(["image", "voice_memo", "file"]),
        duration: z.number().optional(),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await request.json();
    const data = createPostSchema.parse(body);

    // Check if user can post in this space
    const canPost = await canUserPostInSpace(user.id, data.spaceId);
    if (!canPost) {
      return NextResponse.json(
        { error: "Je hebt geen toegang om te posten in deze space" },
        { status: 403 }
      );
    }

    const post = await createPost(
      user.id,
      data.spaceId,
      data.content,
      data.attachments
    );

    await createAuditLog("post.created", user.id, {
      postId: post.id,
      spaceId: data.spaceId,
    });

    return NextResponse.json({ ...post, isLiked: false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Create post error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
