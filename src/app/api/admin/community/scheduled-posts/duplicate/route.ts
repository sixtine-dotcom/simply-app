import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { duplicateScheduledCommunityPosts } from "@/lib/scheduled-community-posts";

const duplicateSchema = z.object({
  sourceCourseId: z.string().min(1),
  targetCourseId: z.string().min(1),
  targetStartAt: z.string().datetime(),
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

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    const user = auth.user;
    const body = await request.json();
    const data = duplicateSchema.parse(body);

    if (data.sourceCourseId === data.targetCourseId) {
      return NextResponse.json(
        { error: "Kies een ander doeltraject om naar te dupliceren." },
        { status: 400 }
      );
    }

    const posts = await duplicateScheduledCommunityPosts({
      sourceCourseId: data.sourceCourseId,
      targetCourseId: data.targetCourseId,
      targetStartAt: new Date(data.targetStartAt),
      authorId: user.id,
    });

    await createAuditLog("community_post.schedule_duplicated", user.id, {
      sourceCourseId: data.sourceCourseId,
      targetCourseId: data.targetCourseId,
      count: posts.length,
    });

    return NextResponse.json({ count: posts.length, posts });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Scheduled posts duplicate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kon posts niet dupliceren" },
      { status: 500 }
    );
  }
}
