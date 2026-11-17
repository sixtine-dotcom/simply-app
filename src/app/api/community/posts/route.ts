import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { createPost, canUserPostInSpace } from "@/lib/community";
import { createMentionNotifications } from "@/lib/community-mentions";

import { canManagePostComments } from "@/lib/community-comment-policy";

const createPostSchema = z.object({
  commentsClosed: z.boolean().optional(),
  title: z.string().max(160).optional().or(z.literal("")),
  content: z.string().min(1, "Bericht is verplicht").max(10000),
  spaceId: z.string().min(1, "Space is verplicht"),
  mentions: z.array(z.string()).max(20).optional(),
  attachments: z
    .array(
      z.object({
        url: z.string(),
        type: z.enum(["image", "video", "voice_memo", "file"]),
        duration: z.number().optional(),
      })
    )
    .optional(),
  poll: z
    .object({
      question: z.string().min(1).max(240),
      options: z.array(z.string().min(1).max(120)).min(2).max(6),
    })
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

    if (data.commentsClosed !== undefined && !canManagePostComments(user.role)) return NextResponse.json({ error: "Alleen beheerders kunnen de reactie-instelling wijzigen." }, { status: 403 });

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
      data.title?.trim() ? data.title.trim() : null,
      data.content,
      data.attachments,
      data.poll,
      data.commentsClosed ?? false
    );

    await createAuditLog("post.created", user.id, {
      postId: post.id,
      spaceId: data.spaceId,
    });

    await createMentionNotifications({
      mentionedUserIds: data.mentions || [],
      spaceId: data.spaceId,
      tenantId: user.tenantId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      link: `/community/${post.space.slug}`,
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
