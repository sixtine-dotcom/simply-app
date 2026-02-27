import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog } from "@/lib/auth";

const updateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  position: z.number().min(0).optional(),
  videoUrl: z.string().nullable().optional(),
  videoProvider: z.string().nullable().optional(),
  videoDuration: z.number().nullable().optional(),
  unlockAfterDays: z.number().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }
) {
  try {
    const { id: courseId, moduleId, lessonId } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateLessonSchema.parse(body);

    const lesson = await db.lesson.update({
      where: { id: lessonId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl }),
        ...(data.videoProvider !== undefined && { videoProvider: data.videoProvider }),
        ...(data.videoDuration !== undefined && { videoDuration: data.videoDuration }),
        ...(data.unlockAfterDays !== undefined && { unlockAfterDays: data.unlockAfterDays }),
      },
    });

    await createAuditLog("lesson.updated", user.id, {
      courseId,
      moduleId,
      lessonId,
      changes: data,
    });

    return NextResponse.json(lesson);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Update lesson error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }
) {
  try {
    const { id: courseId, moduleId, lessonId } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    await db.lesson.delete({
      where: { id: lessonId },
    });

    await createAuditLog("lesson.deleted", user.id, {
      courseId,
      moduleId,
      lessonId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete lesson error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        attachments: true,
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Les niet gevonden" }, { status: 404 });
    }

    return NextResponse.json(lesson);
  } catch (error) {
    console.error("Get lesson error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
