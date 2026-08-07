import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import {
  createScheduledCommunityPost,
  getScheduledCommunityPosts,
} from "@/lib/scheduled-community-posts";

const attachmentSchema = z.object({
  url: z.string().url(),
  type: z.enum(["image", "video", "voice_memo", "file"]),
  duration: z.number().int().positive().optional(),
});

const createSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().max(160).optional().or(z.literal("")),
  content: z.string().trim().min(1, "Bericht is verplicht").max(10000),
  scheduledAt: z.string().datetime(),
  isPinned: z.boolean().optional(),
  attachments: z.array(attachmentSchema).optional(),
  poll: z
    .object({
      question: z.string().trim().min(1).max(240),
      options: z.array(z.string().trim().min(1).max(120)).min(2).max(6),
    })
    .optional()
    .nullable(),
});

async function requireAdminApi() {
  const user = await getCurrentUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Niet ingelogd" }, { status: 401 }) };
  }
  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    return { response: NextResponse.json({ error: "Geen toegang" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    const courseId = request.nextUrl.searchParams.get("courseId") || undefined;
    const posts = await getScheduledCommunityPosts(courseId);

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Scheduled posts fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kon geplande posts niet laden" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    const user = auth.user;
    const body = await request.json();
    const data = createSchema.parse(body);

    const post = await createScheduledCommunityPost({
      courseId: data.courseId,
      authorId: user.id,
      title: data.title,
      content: data.content,
      scheduledAt: new Date(data.scheduledAt),
      isPinned: data.isPinned,
      attachments: data.attachments,
      poll: data.poll || null,
    });

    await createAuditLog("community_post.scheduled", user.id, {
      scheduledPostId: post.id,
      courseId: data.courseId,
      scheduledAt: data.scheduledAt,
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Scheduled post create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kon geplande post niet maken" },
      { status: 500 }
    );
  }
}
