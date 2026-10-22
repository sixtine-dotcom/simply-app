import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getLesson } from "@/lib/courses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmbeddedVideo } from "@/components/courses/embedded-video";
import { LessonCompleteButton } from "./complete-button";
import { LessonChecklist } from "./lesson-checklist";
import { LessonVideoBlock } from "./lesson-video-block";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Lock,
  PlayCircle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface LessonPageProps {
  params: Promise<{ slug: string; lessonId: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug, lessonId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }
  if (user.role === "ADMIN") redirect("/admin");

  const lesson = await getLesson(lessonId, user.id);

  if (!lesson) {
    notFound();
  }

  if (lesson.isLocked) {
    const formGate = "accessGate" in lesson && lesson.accessGate ? lesson.accessGate : null;
    return (
      <div className="min-h-screen bg-white p-6 md:p-8">
        <div className="mx-auto max-w-xl pt-20">
          <Card className="border-black/10 bg-white shadow-none">
            <CardContent className="pt-8 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center border border-black/10 bg-stone-50">
                <Lock className="h-8 w-8 text-stone-500" />
              </div>
              <h1 className="font-display text-xl tracking-[0.08em] text-stone-900">
                DEZE LES IS NOG NIET BESCHIKBAAR
              </h1>
              <p className="mx-auto mt-3 max-w-md text-stone-600">
                {formGate
                  ? "Vul eerst je voedingsvragenlijst volledig in. Daarna worden je cursus en lessen automatisch beschikbaar."
                  : `Deze les wordt beschikbaar op ${formatDate(lesson.unlocksAt!)}. Tot dan kun je je eerdere lessen opnieuw bekijken.`}
              </p>
              <Button asChild className="mt-6 bg-[#173622] px-6 text-white hover:bg-[#21492e]">
                <Link href={formGate ? `/forms/${formGate.formSlug}` : `/courses/${slug}`}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  {formGate ? "Voedingsvragenlijst invullen" : "Terug naar cursus"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const navigationProgress = lesson.nextLesson || lesson.previousLesson ? 50 : 100;
  const checklistItems = getStringArray(lesson.checklistItems);
  const checklistState = getChecklistState(lesson.checklistState);
  const moduleLessons = lesson.module.lessons;
  const lessonNumber = moduleLessons.findIndex((moduleLesson) => moduleLesson.id === lessonId) + 1;
  const totalModuleLessons = moduleLessons.length;
  const moduleWatchedPercentage = typeof lesson.moduleWatchedPercentage === "number"
    ? lesson.moduleWatchedPercentage
    : null;

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-7xl px-4 pt-4 md:px-6 md:pt-6 lg:px-8 lg:pt-8">
        <div className="overflow-hidden border-y border-black/10 bg-white">
        <div className="px-6 py-5 md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href={`/courses/${slug}`}
                className="inline-flex items-center text-sm text-stone-500 transition hover:text-stone-900"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Terug naar {lesson.module.title}
              </Link>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-stone-500">
                {lesson.module.course.title}
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-stone-900 md:text-3xl">{lesson.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-600">
                <span className="border-l border-black/15 pl-3">
                  Module: {lesson.module.title}
                </span>
                <span className="border-l border-black/15 pl-3">
                  Les {lessonNumber}/{totalModuleLessons}
                </span>
                {moduleWatchedPercentage !== null ? (
                  <span className="border-l border-black/15 pl-3">
                    {moduleWatchedPercentage}% van deze module bekeken
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {lesson.previousLesson ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/courses/${slug}/lessons/${lesson.previousLesson.id}`}>
                    <ChevronLeft className="h-4 w-4" />
                    <span className="ml-1">Vorige</span>
                  </Link>
                </Button>
              ) : null}
              {lesson.nextLesson ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/courses/${slug}/lessons/${lesson.nextLesson.id}`}>
                    <span className="mr-1">Volgende</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-8 md:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="space-y-8">
          <Card className="border-black/10 bg-white shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-stone-900">Lesinhoud</CardTitle>
            </CardHeader>
            <CardContent>
              {lesson.content ? (
                <div className="prose prose-stone max-w-none prose-headings:font-display prose-headings:tracking-[0.04em] prose-p:text-stone-700 prose-li:text-stone-700">
                  <LessonContent content={lesson.content} />
                </div>
              ) : (
                <div className="border-y border-black/10 bg-stone-50 p-5 text-sm leading-6 text-stone-600">
                  Voor deze les is nog geen lesinhoud toegevoegd.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-black/10 bg-white shadow-none">
            <CardContent className="p-0">
              {lesson.videoEmbedCode ? (
                <EmbeddedVideo embedCode={lesson.videoEmbedCode} />
              ) : lesson.videoUrl ? (
                <LessonVideoBlock
                  lessonId={lessonId}
                  url={lesson.videoUrl}
                  provider={lesson.videoProvider}
                  initialProgress={lesson.videoProgress}
                  videoDuration={lesson.videoDuration}
                />
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
            <Card className="border-black/10 bg-white shadow-none">
              <CardHeader className="px-8 pb-2 pt-8 md:px-10 md:pt-10">
                <CardTitle className="text-xl text-stone-900">Aanvullende informatie</CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8 pt-2 md:px-10 md:pb-10">
                <div className="prose prose-stone max-w-none prose-headings:font-display prose-headings:tracking-[0.04em] prose-p:text-stone-700 prose-li:text-stone-700">
                  <LessonContent content={lesson.extraContent} />
                </div>
              </CardContent>
            </Card>
          ) : null}

          {checklistItems.length > 0 ? (
            <LessonChecklist
              lessonId={lessonId}
              title={lesson.checklistTitle || "Opdrachten"}
              items={checklistItems}
              initialState={checklistState}
            />
          ) : null}

          {lesson.attachments && lesson.attachments.length > 0 ? (
            <Card className="border-black/10 bg-white shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-stone-900">Downloads & werkbladen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lesson.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={attachment.type === "pdf" || attachment.type === "file" ? attachment.name : undefined}
                    className="flex items-center gap-3 border-b border-stone-200 bg-stone-50 px-4 py-4 transition last:border-b-0 hover:bg-white"
                  >
                    <div className="flex h-10 w-10 items-center justify-center border border-black/10 bg-white">
                      <FileText className="h-5 w-5 text-stone-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-stone-900">{attachment.name}</p>
                      <p className="text-sm text-stone-500">Open of download dit bestand voor later.</p>
                    </div>
                    <Download className="h-4 w-4 shrink-0 text-stone-400" />
                  </a>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </main>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Card className="border-0 bg-[#173622] text-stone-100 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-white">Jouw voortgang</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm text-stone-300">
                  <span>Lesstatus</span>
                  <span>{lesson.isCompleted ? "100%" : `${navigationProgress}%`}</span>
                </div>
                <Progress value={lesson.isCompleted ? 100 : navigationProgress} className="h-2" />
              </div>

              <div className="border-y border-white/10 py-4">
                <div className="flex items-center gap-2 text-sm text-stone-300">
                  <Clock3 className="h-4 w-4" />
                  Videovoortgang opgeslagen
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-400">
                  Je video gaat verder vanaf waar je de vorige keer bent gestopt.
                </p>
              </div>

              <LessonCompleteButton lessonId={lessonId} isCompleted={lesson.isCompleted} />

              {lesson.isCompleted ? (
                <div className="inline-flex items-center gap-2 border-l border-emerald-300/40 pl-3 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Deze les is voltooid
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-black/10 bg-white shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-stone-900">Navigatie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lesson.previousLesson ? (
                <Link
                  href={`/courses/${slug}/lessons/${lesson.previousLesson.id}`}
                  className="block border-b border-stone-200 bg-stone-50 px-4 py-4 transition hover:bg-white"
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Vorige les</p>
                  <p className="mt-1 font-medium text-stone-900">{lesson.previousLesson.title}</p>
                </Link>
              ) : null}
              {lesson.nextLesson ? (
                <Link
                  href={`/courses/${slug}/lessons/${lesson.nextLesson.id}`}
                  className="block border-b border-stone-200 bg-stone-50 px-4 py-4 transition hover:bg-white"
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Volgende les</p>
                  <p className="mt-1 font-medium text-stone-900">{lesson.nextLesson.title}</p>
                </Link>
              ) : (
                <div className="border-b border-stone-200 bg-stone-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Einde van module</p>
                  <p className="mt-1 font-medium text-stone-900">Je hebt de laatste les van dit blok bereikt.</p>
                </div>
              )}

              <Button asChild variant="outline" className="w-full">
                <Link href={`/courses/${slug}`}>Terug naar het cursusoverzicht</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function LessonContent({ content }: { content: string }) {
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(content);

  if (looksLikeHtml) {
    const sanitized = content
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/\son\w+="[^"]*"/gi, "")
      .replace(/\son\w+='[^']*'/gi, "")
      .replace(/javascript:/gi, "");

    return (
      <div
        className="[&_img]:max-w-full [&_img]:h-auto [&_font[face='The\ Seasons']]:font-display"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }

  const lines = content.split("\n");

  return (
    <>
      {lines.map((line, index) => {
        if (line.startsWith("# ")) {
          return (
            <h1 key={index} className="mt-8 text-2xl font-display tracking-[0.05em] text-stone-900">
              {line.slice(2)}
            </h1>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h2 key={index} className="mt-6 text-xl font-display tracking-[0.04em] text-stone-900">
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3 key={index} className="mt-4 text-lg font-semibold text-stone-900">
              {line.slice(4)}
            </h3>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <li key={index} className="ml-4">
              {line.slice(2)}
            </li>
          );
        }
        if (line.trim() === "") {
          return <br key={index} />;
        }
        return (
          <p key={index} className="mb-4 leading-7">
            {line}
          </p>
        );
      })}
    </>
  );
}

function getStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getChecklistState(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean")
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
