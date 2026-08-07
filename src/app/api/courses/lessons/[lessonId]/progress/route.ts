import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { markLessonComplete, markLessonIncomplete, updateVideoProgress } from "@/lib/courses";
import { db } from "@/lib/db";
import { getBlockingCourseFormForUser } from "@/lib/forms";

const progressSchema = z.object({
  completed: z.boolean().optional(),
  videoProgress: z.number().optional(),
  videoDuration: z.number().optional(),
  checklistState: z.record(z.boolean()).optional(),
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

    const now = new Date();
    if (enrollment.startDate > now || (enrollment.endDate && enrollment.endDate < now)) {
      return NextResponse.json({ error: "Deze cursus is nog niet actief" }, { status: 403 });
    }

    const accessGate = await getBlockingCourseFormForUser(user.id, lesson.module.courseId);
    if (accessGate) {
      return NextResponse.json(
        { error: "Vul eerst het verplichte formulier in", formSlug: accessGate.formSlug },
        { status: 403 }
      );
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

    if (data.videoDuration !== undefined && data.videoDuration > 0 && !lesson.videoDuration) {
      await db.lesson.update({
        where: { id: lessonId },
        data: { videoDuration: Math.floor(data.videoDuration) },
      });
    }

    if (data.checklistState !== undefined) {
      await db.progress.upsert({
        where: {
          userId_lessonId: {
            userId: user.id,
            lessonId,
          },
        },
        create: {
          userId: user.id,
          lessonId,
          checklistState: data.checklistState,
        },
        update: {
          checklistState: data.checklistState,
        },
      });
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
      checklistState: progress?.checklistState || {},
    });
  } catch (error) {
    console.error("Get progress error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
