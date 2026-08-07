import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }
) {
  try {
    const { id: courseId, moduleId, lessonId } = await params;
    const user = await getCurrentUser();

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: true,
        attachments: true,
      },
    });

    if (!lesson || lesson.moduleId !== moduleId || lesson.module.courseId !== courseId) {
      return NextResponse.json({ error: "Les niet gevonden" }, { status: 404 });
    }

    const lastLesson = await db.lesson.findFirst({
      where: { moduleId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const duplicatedLesson = await db.lesson.create({
      data: {
        moduleId,
        title: `${lesson.title} (kopie)`,
        content: lesson.content,
        extraContent: lesson.extraContent,
        checklistTitle: lesson.checklistTitle,
        checklistItems:
          lesson.checklistItems === null
            ? Prisma.JsonNull
            : (lesson.checklistItems as Prisma.InputJsonValue),
        position: (lastLesson?.position ?? -1) + 1,
        videoUrl: lesson.videoUrl,
        videoProvider: lesson.videoProvider,
        videoDuration: lesson.videoDuration,
        videoEmbedCode: lesson.videoEmbedCode,
        unlockAfterDays: lesson.unlockAfterDays,
        attachments: {
          create: lesson.attachments.map((attachment) => ({
            name: attachment.name,
            url: attachment.url,
            type: attachment.type,
            size: attachment.size,
          })),
        },
      },
    });

    await createAuditLog("lesson.duplicated", user.id, {
      courseId,
      moduleId,
      originalLessonId: lessonId,
      duplicatedLessonId: duplicatedLesson.id,
    });

    return NextResponse.json({
      id: duplicatedLesson.id,
      moduleId,
      courseId,
    });
  } catch (error) {
    console.error("Duplicate lesson error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
