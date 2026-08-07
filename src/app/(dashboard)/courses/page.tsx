import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Clock, Lock, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";
import { getBlockingCourseFormsForUser } from "@/lib/forms";

export default async function CoursesPage() {
  const user = await getCurrentUser();

  if (!user) return null;
  if (user.role === "ADMIN") redirect("/admin");

  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    include: {
      course: {
        include: {
          modules: {
            include: {
              lessons: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const blockingForms = await getBlockingCourseFormsForUser({
    userId: user.id,
    courseIds: enrollments.map((enrollment) => enrollment.courseId),
  });

  const coursesWithDetails = await Promise.all(
    enrollments.map(async (enrollment) => {
      const totalLessons = enrollment.course.modules.reduce(
        (acc, module) => acc + module.lessons.length,
        0
      );

      const completedLessons = await db.progress.count({
        where: {
          userId: user.id,
          lesson: {
            module: {
              courseId: enrollment.courseId,
            },
          },
          completedAt: { not: null },
        },
      });

      const now = new Date();
      const isExpired = Boolean(enrollment.endDate && enrollment.endDate < now);
      const isNotStarted = enrollment.startDate > now;
      const daysRemaining = enrollment.endDate
        ? Math.ceil((enrollment.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        ...enrollment,
        totalLessons,
        completedLessons,
        progressPercentage:
          totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        isExpired,
        isNotStarted,
        daysRemaining,
        accessGate: blockingForms.get(enrollment.courseId) || null,
      };
    })
  );

  const enrolledCourseIds = enrollments.map((enrollment) => enrollment.courseId);
  const lockedCourses = await db.course.findMany({
    where: {
      isPublished: true,
      hideForUnauthorized: false,
      id: enrolledCourseIds.length > 0 ? { notIn: enrolledCourseIds } : undefined,
    },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      isPrivate: true,
    },
  });

  const activeCourses = coursesWithDetails.filter((course) => !course.isExpired);
  const expiredCourses = coursesWithDetails.filter((course) => course.isExpired);
  const hasCourses =
    activeCourses.length > 0 || expiredCourses.length > 0 || lockedCourses.length > 0;

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden app-halo">
            <CardContent className="p-0">
              <div className="grid gap-8 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(248,242,233,0.82))] p-8 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <p className="app-kicker">
                    Learning Library
                  </p>
                  <h1 className="mt-4 font-display text-4xl tracking-tight text-slate-900 md:text-5xl">
                    Je programma&apos;s, duidelijk en rustig op één plek.
                  </h1>
                  <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
                    Hier zie je precies wat actief is, waar je staat in je voortgang en welke
                    trajecten nog op je wachten.
                  </p>
                </div>
                <div className="grid gap-3">
                  <div className="app-panel-muted p-5">
                    <p className="text-sm text-muted-foreground">Actieve cursussen</p>
                    <p className="mt-2 text-2xl font-semibold">{activeCourses.length}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {expiredCourses.length} verlopen · {lockedCourses.length} op slot
                    </p>
                  </div>
                  <div className="app-panel-muted p-5">
                    <p className="text-sm text-muted-foreground">Gemiddelde voortgang</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {activeCourses.length > 0
                        ? Math.round(
                            activeCourses.reduce((sum, course) => sum + course.progressPercentage, 0) /
                              activeCourses.length
                          )
                        : 0}
                      %
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      over je actieve programma&apos;s
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="app-halo">
            <CardHeader>
              <CardTitle>Snelle acties</CardTitle>
              <CardDescription>Ga direct verder op de juiste plek.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuickAction
                href="/community"
                title="Open community"
                description="Stel een vraag of deel een update."
              />
              <QuickAction
                href="/trackers/weekly-overview"
                title="Open weekoverzicht"
                description="Houd je ritme vast tussen je lessen."
              />
              <QuickAction
                href="/coaching"
                title="Bekijk coaching"
                description="Check je geplande sessies en opvolging."
              />
            </CardContent>
          </Card>
        </section>

        {!hasCourses ? (
          <Card className="app-halo">
            <CardContent className="py-12 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h2 className="mt-4 text-lg font-semibold">Nog geen cursussen beschikbaar</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Zodra je wordt ingeschreven, verschijnen je programma&apos;s hier.
              </p>
              <Button className="mt-5" asChild>
                <a href="https://simplyinbalance.com" target="_blank" rel="noopener noreferrer">
                  Bekijk programma&apos;s
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <section>
              <div className="mb-5 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold">Actieve programma&apos;s</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {activeCourses.map((enrollment) => (
                  <CourseCard key={enrollment.id} enrollment={enrollment} />
                ))}
              </div>
            </section>

            {expiredCourses.length > 0 ? (
              <section>
                <div className="mb-5 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-lg font-semibold text-muted-foreground">Verlopen toegang</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {expiredCourses.map((enrollment) => (
                    <CourseCard key={enrollment.id} enrollment={enrollment} expired />
                  ))}
                </div>
              </section>
            ) : null}

            {lockedCourses.length > 0 ? (
              <section>
                <div className="mb-5 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-lg font-semibold text-muted-foreground">
                    Beschikbaar met toegang
                  </h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {lockedCourses.map((course) => (
                    <LockedCourseCard key={course.id} course={course} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

interface CourseCardProps {
  enrollment: {
    id: string;
    course: {
      title: string;
      slug: string;
      description: string | null;
      thumbnailUrl: string | null;
      isPrivate: boolean;
    };
    startDate: Date;
    endDate: Date | null;
    progressPercentage: number;
    completedLessons: number;
    totalLessons: number;
    isNotStarted: boolean;
    daysRemaining: number | null;
    accessGate: {
      formSlug: string;
      formTitle: string;
    } | null;
  };
  expired?: boolean;
}

function CourseCard({ enrollment, expired }: CourseCardProps) {
  const { course, progressPercentage, completedLessons, totalLessons, isNotStarted, daysRemaining, startDate, accessGate } =
    enrollment;

  return (
    <Card className={expired ? "border-slate-200 bg-white/80 opacity-70" : "app-halo"}>
      <CardContent className="p-0">
        <div className="relative h-44 rounded-t-[28px] bg-[linear-gradient(135deg,rgba(56,87,57,0.16),rgba(177,138,74,0.08))]">
          {course.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="h-full w-full rounded-t-[28px] object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-2xl text-primary/35 tracking-[0.12em]">
                Simply leeromgeving
              </span>
            </div>
          )}

          {course.isPrivate ? (
            <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-white">
              1-op-1
            </span>
          ) : null}

          {expired ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-t-[28px] bg-black/45">
              <span className="flex items-center gap-2 font-medium text-white">
                <Lock className="h-4 w-4" />
                Toegang verlopen
              </span>
            </div>
          ) : null}

          {isNotStarted && !expired ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-t-[28px] bg-black/30">
              <span className="flex items-center gap-2 font-medium text-white">
                <Clock className="h-4 w-4" />
                Start {formatDate(startDate)}
              </span>
            </div>
          ) : null}

          {accessGate && !expired ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-t-[28px] bg-stone-950/65 px-6 text-center">
              <span className="font-medium text-white">
                <Lock className="mx-auto mb-2 h-5 w-5" />
                Eerst voedingsvragenlijst invullen
              </span>
            </div>
          ) : null}
        </div>

        <div className="p-5">
          <h3 className="text-lg font-semibold">{course.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {course.description || "Je persoonlijke traject binnen Simply leeromgeving."}
          </p>

          {!expired && !isNotStarted && !accessGate ? (
            <>
              <div className="mt-4 flex items-center gap-3">
                <Progress value={progressPercentage} className="h-2 flex-1" />
                <span className="text-sm font-medium text-muted-foreground">{progressPercentage}%</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {completedLessons} van {totalLessons} lessen voltooid
              </p>
            </>
          ) : null}

          {daysRemaining !== null && !expired ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {daysRemaining > 0 ? `Nog ${daysRemaining} dagen toegang` : "Laatste dag!"}
            </p>
          ) : null}

          {enrollment.endDate === null && !expired ? (
            <p className="mt-2 text-sm text-muted-foreground">Onbeperkte toegang</p>
          ) : null}

          <div className="mt-5">
            {expired ? (
              <Button variant="outline" className="w-full" disabled>
                Toegang verlopen
              </Button>
            ) : accessGate ? (
              <Button className="w-full" asChild>
                <Link href={`/forms/${accessGate.formSlug}`}>
                  Voedingsvragenlijst invullen
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : isNotStarted ? (
              <Button variant="outline" className="w-full" disabled>
                Nog niet beschikbaar
              </Button>
            ) : (
              <Button className="w-full" asChild>
                <Link href={`/courses/${course.slug}`}>
                  {progressPercentage > 0 ? "Ga verder" : "Start programma"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LockedCourseCard({
  course,
}: {
  course: {
    title: string;
    thumbnailUrl: string | null;
    isPrivate: boolean;
  };
}) {
  return (
    <Card className="border-slate-200 bg-white/80">
      <CardContent className="p-0">
        <div className="relative h-44 rounded-t-[28px] bg-[linear-gradient(135deg,rgba(56,87,57,0.12),rgba(177,138,74,0.08))]">
          {course.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="h-full w-full rounded-t-[28px] object-cover opacity-70"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-2xl tracking-[0.12em] text-primary/30">
                Simply leeromgeving
              </span>
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center rounded-t-[28px] bg-black/45">
            <span className="flex items-center gap-2 font-medium text-white">
              <Lock className="h-4 w-4" />
              Toegang nodig
            </span>
          </div>

          {course.isPrivate ? (
            <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-stone-900">
              1-op-1
            </span>
          ) : null}
        </div>

        <div className="p-5">
          <h3 className="text-lg font-semibold">{course.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Deze cursus is zichtbaar, maar de inhoud blijft afgeschermd tot je toegang hebt.
          </p>
          <div className="mt-5">
            <Button variant="outline" className="w-full" disabled>
              <Lock className="mr-2 h-4 w-4" />
              Op slot
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition-colors hover:border-primary/30 hover:bg-white"
    >
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
