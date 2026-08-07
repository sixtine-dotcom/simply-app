import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Clock3, Eye, Layers3, Library, PlaySquare } from "lucide-react";
import { LessonEditForm } from "./lesson-form";
import { LessonAttachmentsSection } from "./lesson-attachments";
import { LessonActionsPanel } from "./lesson-actions-panel";

interface LessonEditPageProps {
  params: Promise<{ id: string; moduleId: string; lessonId: string }>;
}

export default async function LessonEditPage({ params }: LessonEditPageProps) {
  const { id: courseId, moduleId, lessonId } = await params;
  await requireAdminUser("/admin/courses");

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            include: {
              modules: {
                orderBy: { position: "asc" },
                select: { id: true },
              },
            },
          },
          lessons: {
            orderBy: { position: "asc" },
            select: { id: true, videoDuration: true },
          },
        },
      },
      attachments: true,
    },
  });

  if (!lesson || lesson.moduleId !== moduleId || lesson.module.courseId !== courseId) {
    notFound();
  }

  const courseOptions = await db.course.findMany({
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      modules: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          lessons: {
            orderBy: { position: "asc" },
            select: { id: true, title: true },
          },
        },
      },
    },
  });

  const course = lesson.module.course;
  const moduleNumber = course.modules.findIndex((courseModule) => courseModule.id === moduleId) + 1;
  const lessonNumber = lesson.module.lessons.findIndex((moduleLesson) => moduleLesson.id === lessonId) + 1;
  const totalModuleLessons = lesson.module.lessons.length;
  const moduleDuration = lesson.module.lessons.reduce(
    (total, moduleLesson) => total + (moduleLesson.videoDuration ?? 0),
    0
  );

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-3xl">
      <div className="mb-8">
        <div className="rounded-[1.8rem] border border-border bg-[linear-gradient(135deg,rgba(247,244,237,0.98),rgba(255,255,255,0.95))] p-6 shadow-card">
          <Link
            href={`/admin/courses/${courseId}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Terug naar {course.title}
          </Link>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                {course.title} / {lesson.module.title} / Lesson
              </p>
              <h1 className="mt-3 font-display text-2xl tracking-wider">
                LES BEWERKEN
              </h1>
              <p className="mt-1 text-muted-foreground">
                Module {moduleNumber}: {lesson.module.title} → les {lessonNumber}/{totalModuleLessons}: {lesson.title}
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/preview`} target="_blank">
                <Eye className="mr-2 h-4 w-4" />
                Preview als klant
              </Link>
            </Button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Link
              href={`/admin/courses/${courseId}`}
              className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 transition hover:border-primary/40 hover:bg-white"
            >
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <Library className="h-3.5 w-3.5" />
                Course
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">{course.title}</p>
            </Link>
            <Link
              href={`/admin/courses/${courseId}`}
              className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 transition hover:border-primary/40 hover:bg-white"
            >
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <Layers3 className="h-3.5 w-3.5" />
                Module
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">{lesson.module.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">Module {moduleNumber}</p>
            </Link>
            <Link
              href={`/admin/courses/${courseId}`}
              className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 transition hover:border-primary/40 hover:bg-white"
            >
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <PlaySquare className="h-3.5 w-3.5" />
                Lesson
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">{lesson.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">Les {lessonNumber}/{totalModuleLessons}</p>
            </Link>
            <Link
              href={`/admin/courses/${courseId}`}
              className="rounded-2xl border border-border/70 bg-white/80 px-4 py-3 transition hover:border-primary/40 hover:bg-white md:col-span-3"
            >
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                Moduleduur
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">
                {moduleDuration > 0 ? `${formatDuration(moduleDuration)} lesmateriaal` : "Nog geen videoduur bekend"}
              </p>
            </Link>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inhoud & video</CardTitle>
          <p className="text-sm text-muted-foreground">
            Gebruik een Loom of Vimeo URL, of plak embed code van een andere tool. Je ziet de video meteen in de editor.
          </p>
        </CardHeader>
        <CardContent>
          <LessonEditForm
            courseId={courseId}
            moduleId={moduleId}
            lessonId={lessonId}
            initialLesson={lesson}
          />
        </CardContent>
      </Card>

      <LessonAttachmentsSection
        courseId={courseId}
        moduleId={moduleId}
        lessonId={lessonId}
        attachments={lesson.attachments}
      />

      <LessonActionsPanel
        courseId={courseId}
        moduleId={moduleId}
        lessonId={lessonId}
        courses={courseOptions}
      />
    </div>
  );
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return minutes === 0 ? `${hours} uur` : `${hours} uur ${minutes} min`;
}
