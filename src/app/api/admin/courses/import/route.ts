import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog } from "@/lib/auth";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

const lessonSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  position: z.number().min(0).optional(),
  videoUrl: z.string().optional(),
  videoProvider: z.string().optional(),
  unlockAfterDays: z.number().optional(),
});

const moduleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  position: z.number().min(0).optional(),
  unlockAfterDays: z.number().optional(),
  lessons: z.array(lessonSchema).optional(),
});

const importSchema = z.object({
  course: z.object({
    title: z.string().min(1),
    slug: z.string().optional(),
    description: z.string().optional(),
    isPublished: z.boolean().optional(),
    isPrivate: z.boolean().optional(),
  }),
  modules: z.array(moduleSchema).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = await request.json();
    const data = importSchema.parse(body);

    const courseSlug = data.course.slug || slugify(data.course.title);
    const existing = await db.course.findUnique({
      where: { slug: courseSlug },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Slug "${courseSlug}" bestaat al. Kies een andere slug.` },
        { status: 400 }
      );
    }

    const course = await db.course.create({
      data: {
        title: data.course.title,
        slug: courseSlug,
        description: data.course.description,
        isPublished: data.course.isPublished ?? false,
        isPrivate: data.course.isPrivate ?? false,
      },
    });

    for (let mIdx = 0; mIdx < data.modules.length; mIdx++) {
      const mod = data.modules[mIdx];
      const position = mod.position ?? mIdx;
      const moduleRecord = await db.module.create({
        data: {
          courseId: course.id,
          title: mod.title,
          description: mod.description,
          position,
          unlockAfterDays: mod.unlockAfterDays,
        },
      });

      const lessons = mod.lessons ?? [];
      for (let lIdx = 0; lIdx < lessons.length; lIdx++) {
        const les = lessons[lIdx];
        await db.lesson.create({
          data: {
            moduleId: moduleRecord.id,
            title: les.title,
            content: les.content,
            position: les.position ?? lIdx,
            videoUrl: les.videoUrl,
            videoProvider: les.videoProvider ?? (les.videoUrl?.includes("loom") ? "loom" : null),
            unlockAfterDays: les.unlockAfterDays,
          },
        });
      }
    }

    await createAuditLog("course.imported", user.id, {
      courseId: course.id,
      title: course.title,
      modulesCount: data.modules.length,
      lessonsCount: data.modules.reduce((acc, m) => acc + (m.lessons?.length ?? 0), 0),
    });

    const created = await db.course.findUnique({
      where: { id: course.id },
      include: {
        modules: {
          include: { _count: { select: { lessons: true } } },
        },
      },
    });

    return NextResponse.json({
      success: true,
      course: created,
      message: `Cursus "${course.title}" geïmporteerd met ${data.modules.length} modules.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Ongeldige JSON. Controleer het formaat.", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Course import error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het importeren." },
      { status: 500 }
    );
  }
}
