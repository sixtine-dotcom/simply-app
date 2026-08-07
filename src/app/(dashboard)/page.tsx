import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Droplets,
  Dumbbell,
  Lock,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAssignedFormsForUser } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

function getWeekNumber(date: Date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear =
    (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return {
    week: Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7),
    year: date.getFullYear(),
  };
}

function formatSessionDate(date: Date) {
  return new Intl.DateTimeFormat("nl-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  const enrollments = await db.enrollment.findMany({
    where: {
      userId: user.id,
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
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
    take: 3,
  });

  const coursesWithProgress = await Promise.all(
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

      return {
        ...enrollment,
        totalLessons,
        completedLessons,
        progressPercentage:
          totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      };
    })
  );

  const upcomingSessions = await db.coachingSession.findMany({
    where: {
      clientId: user.id,
      scheduledAt: { gte: new Date() },
      status: "scheduled",
    },
    include: {
      coach: true,
    },
    orderBy: { scheduledAt: "asc" },
    take: 1,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayHabitLog, weeklyCheckIn, communityCount, nutritionPlan] = await Promise.all([
    db.habitLog.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
    }),
    db.checkIn.findUnique({
      where: {
        userId_weekNumber_year: {
          userId: user.id,
          weekNumber: getWeekNumber(new Date()).week,
          year: getWeekNumber(new Date()).year,
        },
      },
    }),
    db.spaceMember.count({
      where: { userId: user.id },
    }),
    db.nutritionPlan.findFirst({
      where: { userId: user.id, availableAt: { lte: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { title: true, displayFileName: true },
    }),
  ]);
  const assignedForms = await getAssignedFormsForUser({
    userId: user.id,
    role: user.role,
    tenantId: user.tenantId,
  });

  const completedPrograms = coursesWithProgress.filter(
    (course) => course.progressPercentage >= 100
  ).length;
  const requiredPendingForms = assignedForms.filter(
    (entry) => entry.assignment.isRequired && !entry.isSubmitted
  );
  const nextRequiredForm = requiredPendingForms
    .sort((a, b) => {
      const aTime = a.assignment.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.assignment.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })
    .at(0);
  const nextBlockingForm = requiredPendingForms.find(
    (entry) => entry.assignment.blocksCourseAccess
  );

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden app-halo">
            <CardContent className="p-0">
              <div className="grid gap-8 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(248,242,233,0.82))] p-8 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <p className="app-kicker">
                    Member Space
                  </p>
                  <h1 className="mt-4 max-w-2xl font-display text-4xl tracking-tight text-slate-900 md:text-5xl">
                    Welkom terug, {user.firstName}. Je volgende stap staat al klaar.
                  </h1>
                  <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
                    Dit is je rustige thuisbasis voor coaching, programma&apos;s en community.
                    Geen losse tools, maar één heldere omgeving waarin je verder kunt.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href="/courses">
                        Ga verder in mijn programma&apos;s
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/community">Open community</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/forms">Open formulieren</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/coaching">Bekijk coaching</Link>
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="app-panel-muted p-5">
                    <p className="text-sm text-muted-foreground">Actieve programma&apos;s</p>
                    <p className="mt-2 text-2xl font-semibold">{coursesWithProgress.length}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {completedPrograms} volledig afgerond
                    </p>
                  </div>
                  <div className="app-panel-muted p-5">
                    <p className="text-sm text-muted-foreground">Weekritme</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {weeklyCheckIn ? "Check-in gedaan" : "Check-in open"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {todayHabitLog?.waterGlasses || 0} glazen water vandaag
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/90 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle>Snelle acties</CardTitle>
              <CardDescription>Kies wat je nu wilt doen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuickLink
                href="/courses"
                icon={<BookOpen className="h-4 w-4" />}
                title="Ga verder met je lessen"
                description="Open je huidige traject en vervolg waar je gebleven was."
              />
              <QuickLink
                href="/community"
                icon={<MessageSquare className="h-4 w-4" />}
                title="Deel iets in de community"
                description="Post een vraag, win of update in je groep."
              />
              <QuickLink
                href="/trackers/weekly-overview"
                icon={<Dumbbell className="h-4 w-4" />}
                title="Werk je trackers bij"
                description="Houd je ritme, voortgang en dagelijkse gewoontes vast."
              />
              <QuickLink
                href="/six"
                icon={<Bot className="h-4 w-4" />}
                title="Vraag hulp aan SIX"
                description="Open je AI-assistent voor vragen of snelle begeleiding."
              />
            </CardContent>
          </Card>
        </section>

        {nextBlockingForm ? (
          <section>
            <Card className="overflow-hidden border-amber-200 bg-white shadow-[0_24px_70px_-35px_rgba(120,78,20,0.45)]">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-[1fr_auto]">
                  <div className="p-6 md:p-8">
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Verplichte eerste stap
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold text-stone-950">
                      Vul je gegevens in voor je voedingsschema
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
                      Beantwoord eerst de voedingsvragenlijst. Je antwoorden worden bewaard en na volledige indiening komt je traject automatisch vrij.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-sm font-medium text-amber-900">
                      <Lock className="h-4 w-4" />
                      Cursus en gekoppelde community zijn tot dan vergrendeld
                    </div>
                  </div>
                  <div className="flex items-center bg-[linear-gradient(135deg,#1f4a29,#365f3d)] p-6 md:min-w-[260px] md:p-8">
                    <Button asChild size="lg" className="w-full bg-white text-primary hover:bg-white/90">
                      <Link href={`/forms/${nextBlockingForm.assignment.form.slug}`}>
                        Nu invullen
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {nutritionPlan ? (
          <section>
            <Card className="border-emerald-200 bg-emerald-50/70">
              <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">Nieuw beschikbaar</p>
                  <h2 className="mt-2 text-2xl font-semibold">Je voedingsschema staat klaar</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{nutritionPlan.displayFileName || nutritionPlan.title}</p>
                </div>
                <Button asChild size="lg"><Link href="/recipes/nutrition-plan">Voedingsschema bekijken<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              </CardContent>
            </Card>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            label="Programma&apos;s"
            value={String(coursesWithProgress.length)}
            detail={`${communityCount} community spaces`}
          />
          <MetricCard
            label="Voltooid"
            value={String(completedPrograms)}
            detail="lessenreeksen volledig afgerond"
          />
          <MetricCard
            label="Water"
            value={String(todayHabitLog?.waterGlasses || 0)}
            detail="glazen vandaag"
          />
          <MetricCard
            label="Check-in"
            value={weeklyCheckIn ? "Ja" : "Nee"}
            detail="deze week"
          />
          <MetricCard
            label="Formulieren"
            value={requiredPendingForms.length > 0 ? String(requiredPendingForms.length) : "0"}
            detail={
              requiredPendingForms.length > 0 ? "verplicht en openstaand" : "geen verplichte intake open"
            }
          />
          <MetricCard
            label="Coaching"
            value={upcomingSessions.length > 0 ? "Gepland" : "Geen"}
            detail="volgende sessie"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-white/70 bg-white/90 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle>Mijn programma&apos;s</CardTitle>
              <CardDescription>
                De trajecten die nu actief voor je zijn.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {coursesWithProgress.length > 0 ? (
                coursesWithProgress.map((enrollment) => (
                  <Link
                    key={enrollment.id}
                    href={`/courses/${enrollment.course.slug}`}
                    className="block rounded-3xl border border-slate-200 bg-slate-50 p-5 transition-colors hover:border-primary/30 hover:bg-white"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">{enrollment.course.title}</h3>
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            {enrollment.progressPercentage}% voltooid
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                          {enrollment.completedLessons} van {enrollment.totalLessons} lessen afgerond
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <Progress value={enrollment.progressPercentage} className="h-2 flex-1" />
                          <span className="text-sm text-muted-foreground">
                            {enrollment.progressPercentage}%
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/60" />
                  <h2 className="mt-4 text-lg font-semibold">Nog geen actieve programma&apos;s</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Zodra je toegang krijgt tot een traject, verschijnt het hier.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-white/70 bg-white/90 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle>Volgende coaching</CardTitle>
                <CardDescription>Je eerstvolgende geplande sessie.</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingSessions.length > 0 ? (
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-muted-foreground">Volgende sessie</p>
                    <p className="mt-2 text-xl font-semibold">
                      {formatSessionDate(upcomingSessions[0].scheduledAt)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      met {upcomingSessions[0].coach.firstName} {upcomingSessions[0].coach.lastName}
                    </p>
                    <Button className="mt-5 w-full" asChild>
                      <Link href="/coaching">Bekijk coaching</Link>
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Er staat nog geen coaching gepland.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/70 bg-white/90 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle>Formulieren</CardTitle>
                <CardDescription>
                  Intake, onboarding en check-ins die nog voor je openstaan.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assignedForms.length > 0 ? (
                  <div className="space-y-3">
                    {assignedForms.slice(0, 3).map((entry) => (
                      <Link
                        key={entry.assignment.id}
                        href={`/forms/${entry.assignment.form.slug}`}
                        className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-primary/30 hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-foreground">
                                {entry.assignment.form.title}
                              </p>
                              {entry.assignment.isRequired ? (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                  Verplicht
                                </span>
                              ) : null}
                              {entry.isSubmitted ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                  Ingeleverd
                                </span>
                              ) : entry.isOverdue ? (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                                  Deadline verlopen
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                  Open
                                </span>
                              )}
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {entry.questionCount} vragen
                              {entry.assignment.dueAt
                                ? ` · deadline ${new Intl.DateTimeFormat("nl-BE", {
                                    day: "2-digit",
                                    month: "short",
                                  }).format(entry.assignment.dueAt)}`
                                : ""}
                            </p>
                          </div>
                          <ClipboardList className="mt-0.5 h-5 w-5 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                    <Button className="w-full" variant="outline" asChild>
                      <Link href="/forms">Bekijk alle formulieren</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-muted-foreground">
                      Er staan momenteel geen formulieren voor je open.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/70 bg-white/90 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle>Vandaag</CardTitle>
                <CardDescription>Kleine acties die je ritme ondersteunen.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <Droplets className="h-4 w-4 text-sky-500" />
                      Water
                    </span>
                    <span className="text-muted-foreground">
                      {todayHabitLog?.waterGlasses || 0}/8
                    </span>
                  </div>
                  <Progress
                    value={((todayHabitLog?.waterGlasses || 0) / 8) * 100}
                    className="mt-3 h-2"
                  />
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Weekcheck-in
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {weeklyCheckIn
                      ? "Je check-in van deze week is al ingevuld."
                      : "Je weekcheck-in staat nog open."}
                  </p>
                  <Button className="mt-4 w-full" variant="outline" asChild>
                    <Link href="/trackers/checkins">Open check-ins</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/70 bg-white/90 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle>Member flow</CardTitle>
                <CardDescription>Zo gebruik je het platform het best.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                {nextRequiredForm ? (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <p className="font-medium text-foreground">Eerst nog even afronden</p>
                    <p className="mt-1">
                      Je formulier <span className="font-medium text-foreground">{nextRequiredForm.assignment.form.title}</span> staat nog open.
                    </p>
                    <Button className="mt-4 w-full" asChild>
                      <Link href={`/forms/${nextRequiredForm.assignment.form.slug}`}>Formulier openen</Link>
                    </Button>
                  </div>
                ) : null}
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-medium text-foreground">1. Volg je programma</p>
                  <p className="mt-1">Werk vanuit je lessen en laat de structuur het werk doen.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-medium text-foreground">2. Deel in de community</p>
                  <p className="mt-1">Gebruik je spaces voor vragen, wins en accountability.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-medium text-foreground">3. Houd ritme vast</p>
                  <p className="mt-1">Check-ins en trackers zorgen voor continuïteit tussen sessies.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border-white/70 bg-white/90 shadow-sm backdrop-blur">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function QuickLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition-colors hover:border-primary/30 hover:bg-white"
    >
      <div className="mt-0.5 text-primary">{icon}</div>
      <div className="min-w-0">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
