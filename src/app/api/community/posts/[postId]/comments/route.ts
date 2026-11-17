import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { addComment, canUserAccessSpace } from "@/lib/community";
import { db } from "@/lib/db";
import { syncCommunityCommentToKnowledge } from "@/lib/ai-knowledge";
import { CommentsClosedError, COMMENTS_CLOSED_MESSAGE, canManagePostComments } from "@/lib/community-comment-policy";
import { createMentionNotifications } from "@/lib/community-mentions";

const createCommentSchema = z.object({
  content: z.string().min(1, "Reactie is verplicht").max(5000),
  parentId: z.string().optional(),
  mentions: z.array(z.string()).max(20).optional(),
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

    const body = await request.json();
    const data = createCommentSchema.parse(body);

    // Controleer of het bericht bestaat en de gebruiker toegang heeft.
    // Host-only bepaalt wie nieuwe berichten mag plaatsen; leden mogen wel reageren.
    const post = await db.post.findUnique({
      where: { id: postId },
      include: {
        space: {
          select: { isHostOnly: true, slug: true },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post niet gevonden" }, { status: 404 });
    }

    const hasAccess = await canUserAccessSpace(user.id, post.spaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Geen toegang tot deze space" }, { status: 403 });
    }

    if (post.commentsClosed) return NextResponse.json({ error: COMMENTS_CLOSED_MESSAGE }, { status: 403 });

    const parentComment = data.parentId
      ? await db.comment.findFirst({
          where: { id: data.parentId, postId },
          select: { id: true, authorId: true },
        })
      : null;
    if (data.parentId && !parentComment) {
      return NextResponse.json({ error: "De reactie waarop je antwoordt bestaat niet meer" }, { status: 400 });
    }

    const comment = await addComment(postId, user.id, data.content, data.parentId, data.attachments);

    await createAuditLog("comment.created", user.id, {
      postId,
      commentId: comment.id,
    });

    await createMentionNotifications({
      mentionedUserIds: data.mentions || [],
      spaceId: post.spaceId,
      tenantId: user.tenantId,
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      link: `/community/${post.space.slug}`,
    });

    if (parentComment && parentComment.authorId !== user.id) {
      await db.notification.create({
        data: {
          userId: parentComment.authorId,
          type: "community_reply",
          title: `${user.firstName} ${user.lastName} reageerde op jou`,
          body: data.content,
          link: `/community/${post.space.slug}`,
        },
      });
    }

    // Antwoorden van Sixtine/admins worden automatisch herbruikbare FAQ-kennis.
    // Een fout hierin mag het plaatsen van de communityreactie nooit blokkeren.
    await syncCommunityCommentToKnowledge({
      commentId: comment.id,
      postId,
      authorRole: user.role,
      tenantId: user.tenantId,
    }).catch((error) => console.error("Community knowledge sync failed:", error));

    return NextResponse.json(comment);
  } catch (error) {
    if (error instanceof CommentsClosedError) return NextResponse.json({ error: COMMENTS_CLOSED_MESSAGE }, { status: 403 });
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Create comment error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

export async function GET(
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
      select: {
        spaceId: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post niet gevonden" }, { status: 404 });
    }

    const hasAccess = await canUserAccessSpace(user.id, post.spaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Geen toegang tot deze space" }, { status: 403 });
    }

    const comments = await db.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
        attachments: true,
      },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}


export async function PATCH(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    if (!canManagePostComments(user.role)) return NextResponse.json({ error: "Alleen beheerders kunnen de reactie-instelling wijzigen." }, { status: 403 });
    const parsed = z.object({ commentsClosed: z.boolean() }).strict().safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Kies of reacties aan of uit staan." }, { status: 400 });
    const { postId } = await params;
    const post = await db.post.findUnique({ where: { id: postId }, select: { spaceId: true } });
    if (!post) return NextResponse.json({ error: "Post niet gevonden" }, { status: 404 });
    if (!await canUserAccessSpace(user.id, post.spaceId)) return NextResponse.json({ error: "Geen toegang tot deze space" }, { status: 403 });
    const updated = await db.post.update({ where: { id: postId }, data: { commentsClosed: parsed.data.commentsClosed }, select: { id: true, commentsClosed: true } });
    await createAuditLog("post.comments_setting_changed", user.id, { postId, commentsClosed: updated.commentsClosed }, undefined, user.tenantId);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "De reactie-instelling kon niet worden opgeslagen. Probeer opnieuw." }, { status: 500 });
  }
}
