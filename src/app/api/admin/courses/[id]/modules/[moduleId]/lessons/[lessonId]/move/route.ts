import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog } from "@/lib/auth";

const moveLessonSchema = z.object({
  targetModuleId: z.string().min(1),
  position: z.number().int().min(0).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }
) {
  try {
    const { id: courseId, moduleId, lessonId } = await params;
    const user = await getCurrentUser();

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = await request.json();
    const data = moveLessonSchema.parse(body);

    const [lesson, targetModule] = await Promise.all([
      db.lesson.findUnique({
        where: { id: lessonId },
        include: { module: true },
      }),
      db.module.findUnique({
        where: { id: data.targetModuleId },
        include: { lessons: { orderBy: { position: "asc" } } },
      }),
    ]);

    if (!lesson || lesson.moduleId !== moduleId || lesson.module.courseId !== courseId) {
      return NextResponse.json({ error: "Les niet gevonden" }, { status: 404 });
    }

    if (!targetModule) {
      return NextResponse.json({ error: "Doelmodule niet gevonden" }, { status: 404 });
    }

    const targetLessons = targetModule.lessons.filter((item) => item.id !== lessonId);
    const targetPosition = Math.min(data.position ?? targetLessons.length, targetLessons.length);

    await db.$transaction(async (tx) => {
      if (lesson.moduleId === targetModule.id) {
        const reordered = [...targetLessons];
        reordered.splice(targetPosition, 0, lesson);

        await Promise.all(
          reordered.map((item, index) =>
            tx.lesson.update({
              where: { id: item.id },
              data: { position: index },
            })
          )
        );
        return;
      }

      const sourceLessons = await tx.lesson.findMany({
        where: { moduleId: lesson.moduleId, id: { not: lessonId } },
        orderBy: { position: "asc" },
      });

      await Promise.all(
        sourceLessons.map((item, index) =>
          tx.lesson.update({
            where: { id: item.id },
            data: { position: index },
          })
        )
      );

      const reorderedTarget = [...targetLessons];
      reorderedTarget.splice(targetPosition, 0, lesson);

      await tx.lesson.update({
        where: { id: lessonId },
        data: {
          moduleId: targetModule.id,
          position: targetPosition,
        },
      });

      await Promise.all(
        reorderedTarget
          .filter((item) => item.id !== lessonId)
          .map((item, index) => {
            const position = index >= targetPosition ? index + 1 : index;
            return tx.lesson.update({
              where: { id: item.id },
              data: { position },
            });
          })
      );
    });

    await createAuditLog("lesson.moved", user.id, {
      courseId,
      lessonId,
      fromModuleId: moduleId,
      toModuleId: targetModule.id,
      position: targetPosition,
    });

    return NextResponse.json({
      success: true,
      courseId: targetModule.courseId,
      moduleId: targetModule.id,
      lessonId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Move lesson error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
