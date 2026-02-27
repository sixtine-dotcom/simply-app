import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { markLessonComplete, markLessonIncomplete, updateVideoProgress } from "@/lib/courses";
import { db } from "@/lib/db";

const progressSchema = z.object({
  completed: z.boolean().optional(),
  videoProgress: z.number().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await request.json();
    const data = progressSchema.parse(body);

    // Verify user has access to this lesson
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Les niet gevonden" }, { status: 404 });
    }

    const enrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: lesson.module.courseId,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    // Update progress
    if (data.completed !== undefined) {
      if (data.completed) {
        await markLessonComplete(lessonId, user.id);
        await createAuditLog("lesson.completed", user.id, {
          lessonId,
          courseId: lesson.module.courseId,
        });
      } else {
        await markLessonIncomplete(lessonId, user.id);
      }
    }

    if (data.videoProgress !== undefined) {
      await updateVideoProgress(lessonId, user.id, data.videoProgress);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Progress update error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const progress = await db.progress.findUnique({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId,
        },
      },
    });

    return NextResponse.json({
      isCompleted: !!progress?.completedAt,
      videoProgress: progress?.videoProgress || 0,
    });
  } catch (error) {
    console.error("Get progress error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
