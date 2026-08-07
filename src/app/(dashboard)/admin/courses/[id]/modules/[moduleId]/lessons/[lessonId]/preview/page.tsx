import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock3, Layers3, Library, PlayCircle, PlaySquare } from "lucide-react";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoPlayer } from "@/components/courses/video-player";
import { EmbeddedVideo } from "@/components/courses/embedded-video";
import { LessonChecklist } from "@/app/(dashboard)/courses/[slug]/lessons/[lessonId]/lesson-checklist";

interface LessonPreviewPageProps {
  params: Promise<{ id: string; moduleId: string; lessonId: string }>;
}

export default async function LessonPreviewPage({ params }: LessonPreviewPageProps) {
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

  const checklistItems = Array.isArray(lesson.checklistItems)
    ? lesson.checklistItems.filter((item): item is string => typeof item === "string")
    : [];
  const moduleNumber = lesson.module.course.modules.findIndex((courseModule) => courseModule.id === moduleId) + 1;
  const lessonNumber = lesson.module.lessons.findIndex((moduleLesson) => moduleLesson.id === lessonId) + 1;
  const totalModuleLessons = lesson.module.lessons.length;
  const moduleDuration = lesson.module.lessons.reduce(
    (total, moduleLesson) => total + (moduleLesson.videoDuration ?? 0),
    0
  );

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-7xl px-4 pt-4 md:px-6 md:pt-6 lg:px-8 lg:pt-8">
        <div className="overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,242,233,0.82))] shadow-[0_24px_80px_-34px_rgba(50,32,14,0.28)]">
          <div className="px-6 py-5 md:px-8">
            <Link
              href={`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`}
              className="inline-flex items-center text-sm text-stone-500 transition hover:text-stone-900"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Terug naar editor
            </Link>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-stone-500">
              {lesson.module.course.title}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-stone-900 md:text-3xl">{lesson.title}</h1>
            <p className="mt-1 text-sm text-stone-600">
              Module {moduleNumber}: {lesson.module.title} · les {lessonNumber}/{totalModuleLessons}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <Link
                href={`/admin/courses/${courseId}`}
                className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 transition hover:border-primary/40 hover:bg-white"
              >
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-stone-500">
                  <Library className="h-3.5 w-3.5" />
                  Course
                </div>
                <p className="mt-2 text-sm font-medium text-stone-900">{lesson.module.course.title}</p>
              </Link>
              <Link
                href={`/admin/courses/${courseId}`}
                className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 transition hover:border-primary/40 hover:bg-white"
              >
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-stone-500">
                  <Layers3 className="h-3.5 w-3.5" />
                  Module
                </div>
                <p className="mt-2 text-sm font-medium text-stone-900">{lesson.module.title}</p>
                <p className="mt-1 text-xs text-stone-500">Module {moduleNumber}</p>
              </Link>
              <Link
                href={`/admin/courses/${courseId}`}
                className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 transition hover:border-primary/40 hover:bg-white"
              >
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-stone-500">
                  <PlaySquare className="h-3.5 w-3.5" />
                  Lesson
                </div>
                <p className="mt-2 text-sm font-medium text-stone-900">{lesson.title}</p>
                <p className="mt-1 text-xs text-stone-500">Les {lessonNumber}/{totalModuleLessons}</p>
              </Link>
              <Link
                href={`/admin/courses/${courseId}`}
                className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 transition hover:border-primary/40 hover:bg-white"
              >
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-stone-500">
                <Clock3 className="h-3.5 w-3.5" />
                Moduleduur
              </div>
              <p className="mt-2 text-sm font-medium text-stone-900">
                {moduleDuration > 0 ? formatDuration(moduleDuration) : "Niet bekend"}
              </p>
              </Link>
          </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-8 md:px-6 lg:px-8">
        <main className="space-y-8">
          <Card className="app-halo rounded-[2rem] border-stone-200 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-stone-900">Lesinhoud</CardTitle>
            </CardHeader>
            <CardContent>
              {lesson.content ? (
                <div
                  className="prose prose-stone max-w-none prose-headings:font-display prose-headings:tracking-[0.04em] prose-p:text-stone-700 prose-li:text-stone-700 [&_img]:rounded-2xl [&_img]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: lesson.content }}
                />
              ) : (
                <div className="rounded-2xl bg-stone-50 p-5 text-sm leading-6 text-stone-600">
                  Voor deze les is nog geen lesinhoud toegevoegd.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[2rem] border-stone-200 bg-white shadow-[0_30px_80px_-55px_rgba(0,0,0,0.35)]">
            <CardContent className="p-0">
              {lesson.videoEmbedCode ? (
                <EmbeddedVideo embedCode={lesson.videoEmbedCode} />
              ) : lesson.videoUrl ? (
                <VideoPlayer url={lesson.videoUrl} provider={lesson.videoProvider} />
              ) : (
                <div className="flex min-h-[320px] items-center justify-center bg-stone-950 text-stone-200">
                  <div className="text-center">
                    <PlayCircle className="mx-auto h-10 w-10" />
                    <p className="mt-4 text-sm text-stone-300">Geen video of visual gekoppeld aan deze les</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {lesson.extraContent ? (
            <Card className="app-halo rounded-[2rem] border-stone-200 bg-white">
              <CardHeader className="px-8 pb-2 pt-8 md:px-10 md:pt-10">
                <CardTitle className="text-xl text-stone-900">Aanvullende informatie</CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8 pt-2 md:px-10 md:pb-10">
                <div
                  className="prose prose-stone max-w-none prose-headings:font-display prose-headings:tracking-[0.04em] prose-p:text-stone-700 prose-li:text-stone-700 [&_img]:rounded-2xl [&_img]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: lesson.extraContent }}
                />
              </CardContent>
            </Card>
          ) : null}

          {checklistItems.length > 0 ? (
            <LessonChecklist
              lessonId={lessonId}
              title={lesson.checklistTitle || "Opdrachten"}
              items={checklistItems}
              initialState={{}}
              saveProgress={false}
            />
          ) : null}
        </main>
      </div>
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
