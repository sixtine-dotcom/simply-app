import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog } from "@/lib/auth";

const createLessonSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  position: z.number().min(0),
  videoUrl: z.string().optional(),
  videoProvider: z.string().optional(),
  unlockAfterDays: z.number().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const { id: courseId, moduleId } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = await request.json();
    const data = createLessonSchema.parse(body);

    const lesson = await db.lesson.create({
      data: {
        moduleId,
        title: data.title,
        content: data.content,
        position: data.position,
        videoUrl: data.videoUrl,
        videoProvider: data.videoProvider,
        unlockAfterDays: data.unlockAfterDays,
      },
    });

    await createAuditLog("lesson.created", user.id, {
      courseId,
      moduleId,
      lessonId: lesson.id,
    });

    return NextResponse.json(lesson);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Create lesson error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
