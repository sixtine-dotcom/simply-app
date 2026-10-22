import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getCourseWithProgress } from "@/lib/courses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Award,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Lock,
  PlayCircle,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }
  if (user.role === "ADMIN") redirect("/admin");

  const course = await getCourseWithProgress(slug, user.id);

  if (!course) {
    notFound();
  }

  if (course.accessGate) {
    return (
      <div className="min-h-screen p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-2xl pt-8 md:pt-16">
          <Card className="overflow-hidden border-black/10 bg-white shadow-none">
            <div className="bg-[#173622] px-6 py-8 text-white md:px-10">
              <ClipboardList className="h-9 w-9" />
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-white/65">
                Eerst te voltooien
              </p>
              <h1 className="mt-3 font-display text-3xl tracking-tight">Vul je voedingsvragenlijst in</h1>
              <p className="mt-3 leading-7 text-white/80">
                Zo ontvangen we alle informatie die nodig is om je voedingsschema correct voor te bereiden.
              </p>
            </div>
            <CardContent className="p-6 md:p-10">
              <div className="border border-black/10 bg-[#f7f8f5] p-5 text-sm leading-6 text-[#26332a]">
                <strong>{course.accessGate.assignmentTitle || course.accessGate.formTitle}</strong>
                <p className="mt-1">Je cursus en gekoppelde community worden automatisch beschikbaar zodra je dit formulier volledig hebt ingediend.</p>
              </div>
              <Button asChild size="lg" className="mt-6 w-full">
                <Link href={`/forms/${course.accessGate.formSlug}`}>
                  Formulier nu invullen
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="mt-2 w-full">
                <Link href="/">Terug naar dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (course.enrollment.startDate > new Date()) {
    return (
      <div className="min-h-screen p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-xl pt-12">
          <Card className="app-halo">
            <CardContent className="py-12 text-center">
              <Lock className="mx-auto h-12 w-12 text-primary/50" />
              <h1 className="mt-5 font-display text-2xl tracking-tight">JE TRAJECT IS NOG NIET GESTART</h1>
              <p className="mt-3 text-muted-foreground">
                Alles staat goed klaar. De cursus en community gaan open op {formatDate(course.enrollment.startDate)}.
              </p>
              <Button asChild className="mt-6"><Link href="/">Terug naar dashboard</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  let continueLesson: { moduleId: string; lessonId: string } | null = null;
  for (const courseModule of course.modules) {
    if (courseModule.isLocked) continue;
    for (const lesson of courseModule.lessons) {
      if (!lesson.isLocked && !lesson.isCompleted) {
        continueLesson = { moduleId: courseModule.id, lessonId: lesson.id };
        break;
      }
    }
    if (continueLesson) break;
  }

  if (!continueLesson && course.modules.length > 0) {
    const lastModule = course.modules[course.modules.length - 1];
    if (lastModule.lessons.length > 0 && !lastModule.isLocked) {
      continueLesson = {
        moduleId: lastModule.id,
        lessonId: lastModule.lessons[lastModule.lessons.length - 1].id,
      };
    }
  }

  const unlockedModules = course.modules.filter((module) => !module.isLocked).length;
  const lockedModules = course.modules.length - unlockedModules;
  const nextLockedModule = course.modules.find((module) => module.isLocked && module.unlocksAt);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl p-4 md:p-6 lg:p-8">
        <div className="overflow-hidden border-y border-black/10 bg-white">
        <div className="p-6 md:p-8 lg:p-10">
          <Link
            href="/courses"
            className="inline-flex items-center text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Terug naar cursussen
          </Link>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="p-0 md:py-2">
              <div className="flex flex-wrap items-center gap-3">
                {course.isPrivate ? (
                  <span className="border-l border-[#173622]/30 pl-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#173622]">
                    Privetraject
                  </span>
                ) : (
                  <span className="border-l border-[#173622]/30 pl-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#173622]">
                    Programma
                  </span>
                )}
                {course.enrollment.daysRemaining !== null ? (
                  <span className="inline-flex items-center gap-1 border-l border-black/15 pl-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-600">
                    <Clock className="h-3.5 w-3.5" />
                    Nog {course.enrollment.daysRemaining} dagen toegang
                  </span>
                ) : null}
              </div>

              <h1 className="mt-5 [font-family:'The_Seasons',Georgia,serif] text-[clamp(2.5rem,5vw,4.8rem)] font-normal leading-[0.95] tracking-[-0.035em] text-stone-900">
                {course.title}
              </h1>

              {course.description ? (
                <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600">
                  {course.description}
                </p>
              ) : null}

              <div className="mt-9 grid border-y border-black/10 md:grid-cols-3 md:divide-x md:divide-black/10">
                <MetricCard
                  label="Voortgang"
                  value={`${course.progressPercentage}%`}
                  description={`${course.completedLessons} van ${course.totalLessons} lessen afgerond`}
                  icon={<Sparkles className="h-4 w-4" />}
                />
                <MetricCard
                  label="Modules actief"
                  value={`${unlockedModules}`}
                  description={
                    lockedModules > 0 ? `${lockedModules} komen later vrij` : "Alles is beschikbaar"
                  }
                  icon={<CalendarClock className="h-4 w-4" />}
                />
                <MetricCard
                  label="Community"
                  value={course.hasCommunity ? "Inbegrepen" : "Niet actief"}
                  description={
                    course.hasCommunity
                      ? "Je kunt vragen en updates delen in je groep"
                      : "Deze cursus heeft geen gekoppelde community"
                  }
                  icon={<Users className="h-4 w-4" />}
                />
              </div>

              <div className="mt-8 max-w-xl">
                <div className="mb-2 flex items-center justify-between text-sm text-stone-600">
                  <span>Je leertraject</span>
                  <span className="font-medium text-stone-900">{course.progressPercentage}%</span>
                </div>
                <Progress value={course.progressPercentage} className="h-2.5" />
              </div>

              {course.progressPercentage === 100 && (
                <div className="mt-6 border border-[#b9d0be] bg-[#f3f7f3] p-5">
                  <div className="flex items-center gap-3">
                    <Award className="h-8 w-8 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900">Gefeliciteerd! Je hebt deze cursus voltooid.</p>
                      <p className="text-sm text-green-700 mt-0.5">Download je persoonlijk certificaat als bewijs van voltooiing.</p>
                    </div>
                    <a
                      href={`/api/courses/${slug}/certificate`}
                      download={`certificaat-${slug}.svg`}
                      className="inline-flex items-center gap-2 bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800 flex-shrink-0"
                    >
                      <Award className="h-4 w-4" />
                      Certificaat
                    </a>
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                {continueLesson ? (
                  <Button size="lg" asChild className="bg-[#173622] px-6 text-white hover:bg-[#21492e]">
                    <Link href={`/courses/${slug}/lessons/${continueLesson.lessonId}`}>
                      {course.progressPercentage > 0 ? "Ga verder" : "Start cursus"}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
                {course.hasCommunity ? (
                  <Button size="lg" variant="outline" asChild className="px-6">
                    <Link href="/community">
                      <Users className="mr-2 h-4 w-4" />
                      Naar community
                    </Link>
                  </Button>
                ) : null}
                <Button size="lg" variant="ghost" asChild className="px-6">
                  <Link href={`/courses/${slug}/coachings`}>
                    <Video className="mr-2 h-4 w-4" />
                    Coachings & opnames
                  </Link>
                </Button>
              </div>
            </div>

            <Card className="border-0 bg-[#173622] text-stone-100 shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">Volgende stap</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-stone-300">
                {continueLesson ? (
                  <div className="border-y border-white/10 py-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Aanbevolen</p>
                    <p className="mt-2 text-base font-medium text-white">Ga verder met je volgende les</p>
                    <p className="mt-2 leading-6">
                      Je bent goed bezig. Open je volgende les en houd je ritme vast.
                    </p>
                  </div>
                ) : (
                  <div className="border-y border-white/10 py-4">
                    <p className="text-base font-medium text-white">Alles afgerond</p>
                    <p className="mt-2 leading-6">
                      Je hebt deze cursus volledig doorlopen. Neem de community of downloads nog eens door wanneer nodig.
                    </p>
                  </div>
                )}

                {nextLockedModule?.unlocksAt ? (
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Volgende unlock</p>
                    <p className="mt-2 font-medium text-white">{nextLockedModule.title}</p>
                    <p className="mt-2">
                      Beschikbaar vanaf {formatDate(nextLockedModule.unlocksAt)}.
                    </p>
                  </div>
                ) : null}

                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Toegang gestart</p>
                  <p className="mt-2 font-medium text-white">{formatDate(course.enrollment.startDate)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-4 md:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-stone-900">Jouw lesoverzicht</h2>
            <p className="mt-1 text-sm text-stone-600">
              Werk in volgorde of spring naar een onderdeel dat nu relevant is.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {course.modules.map((module, moduleIndex) => (
            <ModuleCard key={module.id} module={module} courseSlug={slug} moduleNumber={moduleIndex + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="border-b border-black/10 px-4 py-5 last:border-b-0">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-stone-500">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-xl font-semibold text-stone-900">{value}</p>
      <p className="mt-1 text-xs leading-5 text-stone-600">{description}</p>
    </div>
  );
}

interface ModuleCardProps {
  module: {
    id: string;
    title: string;
    description: string | null;
    isLocked: boolean;
    unlocksAt: Date | null;
    lessons: {
      id: string;
      title: string;
      isCompleted: boolean;
      isLocked: boolean;
      unlocksAt: Date | null;
      videoUrl: string | null;
      videoDuration: number | null;
      watchedPercentage: number | null;
      remainingSeconds: number | null;
    }[];
    completedCount: number;
    totalCount: number;
    totalVideoDuration: number;
    watchedPercentage: number | null;
  };
  courseSlug: string;
  moduleNumber: number;
}

function ModuleCard({ module, courseSlug, moduleNumber }: ModuleCardProps) {
  const isComplete = module.completedCount === module.totalCount && module.totalCount > 0;
  const moduleProgress = module.totalCount > 0 ? Math.round((module.completedCount / module.totalCount) * 100) : 0;

  return (
    <Card className="overflow-hidden border-black/10 bg-white shadow-none">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 border-b border-stone-200 p-5 md:flex-row md:items-start md:justify-between md:p-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-10 w-10 items-center justify-center border text-sm font-semibold ${
                module.isLocked
                  ? "border-black/10 bg-stone-50 text-stone-500"
                  : isComplete
                    ? "border-[#173622] bg-[#173622] text-white"
                    : "border-black/10 bg-white text-[#173622]"
              }`}
            >
              {module.isLocked ? <Lock className="h-4 w-4" /> : isComplete ? <CheckCircle2 className="h-5 w-5" /> : moduleNumber}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-stone-900">{module.title}</h3>
                {module.isLocked ? (
                  <span className="border-l border-black/15 pl-2 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-600">
                    Vergrendeld
                  </span>
                ) : isComplete ? (
                  <span className="border-l border-[#173622]/30 pl-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[#173622]">
                    Afgerond
                  </span>
                ) : null}
              </div>
              {module.description ? (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{module.description}</p>
              ) : null}
              <p className="mt-3 text-sm text-stone-500">
                {module.isLocked && module.unlocksAt
                  ? `Beschikbaar vanaf ${formatDate(module.unlocksAt)}`
                  : `${module.completedCount} van ${module.totalCount} lessen afgerond`}
              </p>
              {!module.isLocked && module.watchedPercentage !== null ? (
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-stone-500">
                  <Clock className="h-3.5 w-3.5" />
                  {module.watchedPercentage}% van het lesmateriaal bekeken
                </p>
              ) : null}
            </div>
          </div>

          {!module.isLocked ? (
            <div className="min-w-[170px] border-l border-black/10 pl-4">
              <div className="flex items-center justify-between text-sm text-stone-600">
                <span>Module voortgang</span>
                <span className="font-medium text-stone-900">{moduleProgress}%</span>
              </div>
              <Progress value={moduleProgress} className="mt-3 h-2" />
            </div>
          ) : null}
        </div>

        {!module.isLocked ? (
          <div className="divide-y divide-stone-100">
            {module.lessons.map((lesson, index) => (
              <LessonRow key={lesson.id} lesson={lesson} courseSlug={courseSlug} lessonNumber={index + 1} />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LessonRow({
  lesson,
  courseSlug,
  lessonNumber,
}: {
  lesson: {
    id: string;
    title: string;
    isCompleted: boolean;
    isLocked: boolean;
    unlocksAt: Date | null;
    videoUrl: string | null;
    videoDuration: number | null;
    watchedPercentage: number | null;
    remainingSeconds: number | null;
  };
  courseSlug: string;
  lessonNumber: number;
}) {
  const content = (
    <div
      className={`flex items-center gap-4 px-5 py-4 transition md:px-6 ${
        lesson.isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-stone-50"
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-black/10 bg-white text-sm font-medium text-stone-600">
        {lesson.isLocked ? (
          <Lock className="h-4 w-4" />
        ) : lesson.isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : (
          lessonNumber
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${lesson.isCompleted ? "text-stone-500" : "text-stone-900"}`}>
          {lesson.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
          {lesson.videoUrl ? (
            <span className="inline-flex items-center gap-1 border-l border-black/10 pl-2">
              <PlayCircle className="h-3.5 w-3.5" />
              {lesson.videoDuration ? formatDuration(lesson.videoDuration) : "Video"}
            </span>
          ) : null}
          {lesson.watchedPercentage !== null ? (
            <span className="inline-flex items-center gap-1 border-l border-black/10 pl-2">
              {lesson.watchedPercentage}% bekeken
            </span>
          ) : null}
          {lesson.remainingSeconds && lesson.remainingSeconds > 0 ? (
            <span className="inline-flex items-center gap-1 border-l border-black/10 pl-2">
              Nog {formatDuration(lesson.remainingSeconds)}
            </span>
          ) : null}
          {lesson.isCompleted ? (
            <span className="inline-flex items-center gap-1 border-l border-emerald-300 pl-2 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Voltooid
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 border-l border-amber-300 pl-2 text-amber-700">
              <Circle className="h-3.5 w-3.5" />
              Nog te doen
            </span>
          )}
        </div>
      </div>

      {!lesson.isLocked ? <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" /> : null}
    </div>
  );

  if (lesson.isLocked) {
    return content;
  }

  return <Link href={`/courses/${courseSlug}/lessons/${lesson.id}`}>{content}</Link>;
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
