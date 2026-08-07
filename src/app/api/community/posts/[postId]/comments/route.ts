import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { addComment, canUserAccessSpace } from "@/lib/community";
import { db } from "@/lib/db";

const createCommentSchema = z.object({
  content: z.string().min(1, "Reactie is verplicht").max(5000),
  parentId: z.string().optional(),
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

const voiceRoles = new Set(["ADMIN", "SUPERADMIN", "COACH"]);

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

    // Verify post exists and check if it's a host-only space
    const post = await db.post.findUnique({
      where: { id: postId },
      include: {
        space: {
          select: { isHostOnly: true },
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

    // Host-only spaces don't allow comments from non-admins
    if (post.space.isHostOnly && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Je kunt niet reageren op aankondigingen" },
        { status: 403 }
      );
    }

    if (
      data.attachments?.some((attachment) => attachment.type === "voice_memo") &&
      !voiceRoles.has(user.role)
    ) {
      return NextResponse.json(
        { error: "Voice messages are only available for coaches and admins." },
        { status: 403 }
      );
    }

    const comment = await addComment(postId, user.id, data.content, data.parentId, data.attachments);

    await createAuditLog("comment.created", user.id, {
      postId,
      commentId: comment.id,
    });

    return NextResponse.json(comment);
  } catch (error) {
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
