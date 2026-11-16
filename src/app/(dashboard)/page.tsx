import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Lock,
  MessageSquare,
  Users,
  Utensils,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAssignedFormsForUser } from "@/lib/forms";
import { getUserSessions } from "@/lib/coaching";
import { getUserSpaces } from "@/lib/community";
import { getUserConversations } from "@/lib/messages";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("nl-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
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

  if (!user) return null;
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "COACH") {
    const [upcomingSessions, clientRows, spaces, conversations] = await Promise.all([
      getUserSessions(user.id, "COACH", user.tenantId, { status: "scheduled", limit: 5 }),
      db.coachingSession.findMany({
        where: { coachId: user.id },
        select: { clientId: true },
        distinct: ["clientId"],
      }),
      getUserSpaces(user.id),
      getUserConversations(user.id),
    ]);

    const nextSession = upcomingSessions[0] ?? null;
    const unreadMessages = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);

    return (
      <main className="min-h-screen bg-white text-[#171b18]">
        <div className="mx-auto max-w-[1320px] px-5 py-6 sm:px-8 lg:px-12 lg:py-10">
          <header className="flex items-end justify-between border-b border-black/10 pb-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#667069]">
                Coach omgeving
              </p>
              <h1 className="mt-2 text-[1.1rem] font-medium tracking-[-0.02em]">
                Welkom terug, {user.firstName}
              </h1>
            </div>
            <p className="hidden text-xs capitalize text-[#747b76] sm:block">
              {formatDate(new Date())}
            </p>
          </header>

          <section className="mt-7 grid min-h-[520px] border-b border-black/10 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)]">
            <div className="flex flex-col justify-between py-8 pr-0 lg:py-12 lg:pr-14">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#41614b]">
                  Vandaag
                </p>
                <h2 className="mt-5 max-w-2xl [font-family:'The_Seasons',Georgia,serif] text-[clamp(2.7rem,5.2vw,5.4rem)] font-normal leading-[0.94] tracking-[-0.045em] text-[#191c19]">
                  {nextSession
                    ? `Sessie met ${nextSession.client.firstName}.`
                    : "Je agenda staat klaar."}
                </h2>
                <p className="mt-6 max-w-xl text-sm leading-6 text-[#676e69]">
                  {nextSession
                    ? `${formatSessionDate(nextSession.scheduledAt)} · ${nextSession.duration} minuten · ${nextSession.title || "Coaching sessie"}`
                    : "Plan een nieuwe sessie of bekijk je community en berichten."}
                </p>
              </div>

              <div className="mt-12 flex flex-wrap items-center gap-5">
                <Link
                  href="/admin/sessions"
                  className="inline-flex h-12 items-center gap-3 bg-[#173622] px-6 text-sm font-semibold text-white transition hover:bg-[#21492e]"
                >
                  Naar je agenda <ArrowRight className="h-4 w-4" />
                </Link>
                {nextSession ? (
                  <Link
                    href={`/admin/sessions/${nextSession.id}`}
                    className="inline-flex h-12 items-center gap-2 border border-black/15 px-5 text-sm font-medium text-[#173622] transition hover:bg-[#fafaf8]"
                  >
                    Sessie openen <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="relative min-h-[380px] overflow-hidden lg:min-h-full">
              <Image
                src="/simply-dashboard-plant.jpg"
                alt="Monstera bladeren"
                fill
                priority
                className="object-cover object-center transition-transform duration-700 hover:scale-[1.015]"
                sizes="(min-width: 1024px) 44vw, 100vw"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-white/92 px-5 py-4 backdrop-blur-sm">
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#414843]">
                  Simply in Balance
                </span>
                <span className="text-[10px] text-[#757c77]">Coach · community · opvolging</span>
              </div>
            </div>
          </section>

          <section className="grid border-b border-black/10 md:grid-cols-2 xl:grid-cols-4">
            <Destination
              href="/admin/sessions"
              icon={CalendarDays}
              number="01"
              title="Agenda"
              detail={nextSession ? formatSessionDate(nextSession.scheduledAt) : "Geen sessie gepland"}
            />
            <Destination
              href="/community"
              icon={MessageSquare}
              number="02"
              title="Community"
              detail={spaces.length > 0 ? `${spaces.length} kanalen actief` : "Nog geen kanaal beschikbaar"}
            />
            <Destination
              href="/messages"
              icon={Users}
              number="03"
              title="Berichten"
              detail={
                conversations.length > 0
                  ? unreadMessages > 0
                    ? `${unreadMessages} ongelezen · ${conversations.length} gesprekken`
                    : `${conversations.length} ${conversations.length === 1 ? "gesprek" : "gesprekken"}`
                  : "Nog geen berichten"
              }
            />
            <Destination
              href="/coaching"
              icon={BookOpen}
              number="04"
              title="Sessies"
              detail={`${clientRows.length} ${clientRows.length === 1 ? "klant" : "klanten"} · ${upcomingSessions.length} gepland`}
            />
          </section>

          {upcomingSessions.length > 1 ? (
            <section className="py-10">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#667069]">Agenda</p>
                  <h2 className="mt-2 [font-family:'The_Seasons',Georgia,serif] text-3xl font-normal">Komende sessies</h2>
                </div>
                <Link href="/admin/sessions" className="text-xs font-semibold text-[#274b31] hover:underline">
                  Volledige agenda
                </Link>
              </div>
              <div className="mt-6 divide-y divide-black/10 border-y border-black/10">
                {upcomingSessions.slice(1).map((session) => (
                  <Link
                    key={session.id}
                    href={`/admin/sessions/${session.id}`}
                    className="group grid gap-2 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <span className="text-sm font-medium">
                      {session.title || "Coaching sessie"} · {session.client.firstName} {session.client.lastName}
                    </span>
                    <span className="flex items-center gap-3 text-xs text-[#707772]">
                      {formatSessionDate(session.scheduledAt)}
                      <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
    );
  }

  const enrollments = await db.enrollment.findMany({
    where: {
      userId: user.id,
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
    include: {
      course: {
        include: { modules: { include: { lessons: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const coursesWithProgress = await Promise.all(
    enrollments.map(async (enrollment) => {
      const totalLessons = enrollment.course.modules.reduce(
        (total, module) => total + module.lessons.length,
        0
      );
      const completedLessons = await db.progress.count({
        where: {
          userId: user.id,
          lesson: { module: { courseId: enrollment.courseId } },
          completedAt: { not: null },
        },
      });

      return {
        ...enrollment,
        totalLessons,
        completedLessons,
        progressPercentage:
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0,
      };
    })
  );

  const [upcomingSession, communityCount, nutritionPlan, assignedForms] =
    await Promise.all([
      db.coachingSession.findFirst({
        where: {
          clientId: user.id,
          scheduledAt: { gte: new Date() },
          status: "scheduled",
        },
        orderBy: { scheduledAt: "asc" },
      }),
      db.spaceMember.count({ where: { userId: user.id } }),
      db.nutritionPlan.findFirst({
        where: { userId: user.id, availableAt: { lte: new Date() } },
        orderBy: { createdAt: "desc" },
        select: { title: true, displayFileName: true },
      }),
      getAssignedFormsForUser({
        userId: user.id,
        role: user.role,
        tenantId: user.tenantId,
      }),
    ]);

  const nextBlockingForm = assignedForms
    .filter((entry) => entry.assignment.isRequired && !entry.isSubmitted)
    .sort(
      (a, b) =>
        (a.assignment.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
        (b.assignment.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER)
    )
    .find((entry) => entry.assignment.blocksCourseAccess);
  const primaryCourse = coursesWithProgress[0];

  return (
    <main className="min-h-screen bg-white text-[#171b18]">
      <div className="mx-auto max-w-[1320px] px-5 py-6 sm:px-8 lg:px-12 lg:py-10">
        <header className="flex items-end justify-between border-b border-black/10 pb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#667069]">
              Jouw omgeving
            </p>
            <h1 className="mt-2 text-[1.1rem] font-medium tracking-[-0.02em]">
              Welkom terug, {user.firstName}
            </h1>
          </div>
          <p className="hidden text-xs capitalize text-[#747b76] sm:block">
            {formatDate(new Date())}
          </p>
        </header>

        {nextBlockingForm ? (
          <section className="mt-6 grid gap-5 bg-[#173622] px-5 py-5 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:px-7">
            <div className="flex items-start gap-3">
              <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
              <div>
                <h2 className="text-sm font-semibold">Je intake staat voor je klaar</h2>
                <p className="mt-1 text-xs leading-5 text-white/65">
                  Vul je gegevens in om je traject en voedingsschema vrij te geven.
                </p>
              </div>
            </div>
            <Link
              href={`/forms/${nextBlockingForm.assignment.form.slug}`}
              className="inline-flex h-10 items-center justify-center gap-2 bg-white px-4 text-xs font-semibold text-[#173622] transition hover:bg-[#f2f3f0]"
            >
              Intake invullen <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        ) : null}

        <section className="mt-7 grid min-h-[520px] border-b border-black/10 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)]">
          <div className="flex flex-col justify-between py-8 pr-0 lg:py-12 lg:pr-14">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#41614b]">
                Volgende stap
              </p>
              <h2 className="mt-5 max-w-2xl [font-family:'The_Seasons',Georgia,serif] text-[clamp(2.7rem,5.2vw,5.4rem)] font-normal leading-[0.94] tracking-[-0.045em] text-[#191c19]">
                {nextBlockingForm
                  ? "Jouw traject begint met een goede intake."
                  : primaryCourse
                    ? `Ga verder met ${primaryCourse.course.title}.`
                    : "Alles staat klaar voor jouw volgende hoofdstuk."}
              </h2>
              <p className="mt-6 max-w-xl text-sm leading-6 text-[#676e69]">
                {nextBlockingForm
                  ? "Na je intake verschijnt je programma hier automatisch."
                  : primaryCourse
                    ? `${primaryCourse.completedLessons} van de ${primaryCourse.totalLessons} lessen voltooid. Je gaat verder waar je gebleven bent.`
                    : "Je programma wordt zichtbaar zodra je traject van start gaat."}
              </p>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-5">
              {primaryCourse && !nextBlockingForm ? (
                <Link
                  href={`/courses/${primaryCourse.course.slug}`}
                  className="inline-flex h-12 items-center gap-3 bg-[#173622] px-6 text-sm font-semibold text-white transition hover:bg-[#21492e]"
                >
                  Verder met je traject <ArrowRight className="h-4 w-4" />
                </Link>
              ) : nextBlockingForm ? (
                <p className="inline-flex items-center gap-2 text-xs font-medium text-[#555c57]">
                  <Lock className="h-3.5 w-3.5" /> Lessen openen na je intake
                </p>
              ) : (
                <Link
                  href="/community"
                  className="inline-flex h-12 items-center gap-3 bg-[#173622] px-6 text-sm font-semibold text-white transition hover:bg-[#21492e]"
                >
                  Naar de community <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              {primaryCourse && !nextBlockingForm ? (
                <div className="min-w-[180px]">
                  <div className="flex justify-between text-[10px] font-medium text-[#707772]">
                    <span>Voortgang</span>
                    <span>{primaryCourse.progressPercentage}%</span>
                  </div>
                  <div className="mt-2 h-px bg-black/10">
                    <div
                      className="h-px bg-[#173622]"
                      style={{ width: `${primaryCourse.progressPercentage}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative min-h-[380px] overflow-hidden lg:min-h-full">
            <Image
              src="/simply-dashboard-plant.jpg"
              alt="Monstera bladeren"
              fill
              priority
              className="object-cover object-center transition-transform duration-700 hover:scale-[1.015]"
              sizes="(min-width: 1024px) 44vw, 100vw"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-white/92 px-5 py-4 backdrop-blur-sm">
              <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#414843]">
                Simply in Balance
              </span>
              <span className="text-[10px] text-[#757c77]">Jouw ritme, jouw resultaat</span>
            </div>
          </div>
        </section>

        <section className="grid border-b border-black/10 md:grid-cols-2 xl:grid-cols-4">
          <Destination
            href={primaryCourse ? `/courses/${primaryCourse.course.slug}` : "/courses"}
            icon={BookOpen}
            number="01"
            title="Je lessen"
            detail={primaryCourse ? `${primaryCourse.course.title} · ${primaryCourse.progressPercentage}%` : "Binnenkort beschikbaar"}
          />
          <Destination
            href="/community"
            icon={MessageSquare}
            number="02"
            title="Community"
            detail={communityCount > 0 ? `${communityCount} kanalen voor jou` : "Nog geen kanaal beschikbaar"}
          />
          <Destination
            href="/coaching"
            icon={CalendarDays}
            number="03"
            title="Coaching"
            detail={upcomingSession ? formatSessionDate(upcomingSession.scheduledAt) : "Geen sessie gepland"}
          />
          <Destination
            href="/nutrition-plan"
            icon={Utensils}
            number="04"
            title="Voedingsschema"
            detail={nutritionPlan?.displayFileName || nutritionPlan?.title || "Verschijnt zodra het klaarstaat"}
          />
        </section>

        {coursesWithProgress.length > 1 ? (
          <section className="py-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#667069]">Bibliotheek</p>
                <h2 className="mt-2 [font-family:'The_Seasons',Georgia,serif] text-3xl font-normal">Jouw trajecten</h2>
              </div>
              <Link href="/courses" className="text-xs font-semibold text-[#274b31] hover:underline">Alles bekijken</Link>
            </div>
            <div className="mt-6 divide-y divide-black/10 border-y border-black/10">
              {coursesWithProgress.slice(1).map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.course.slug}`}
                  className="group grid gap-2 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <span className="text-sm font-medium">{course.course.title}</span>
                  <span className="flex items-center gap-3 text-xs text-[#707772]">
                    {course.progressPercentage}% voltooid
                    <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Destination({
  href,
  icon: Icon,
  number,
  title,
  detail,
}: {
  href: string;
  icon: typeof BookOpen;
  number: string;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[170px] flex-col justify-between border-black/10 py-6 pr-5 transition hover:bg-[#fafaf8] md:odd:border-r md:even:pl-6 xl:border-r xl:pl-6 xl:first:pl-0 xl:last:border-r-0"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-[0.2em] text-[#929792]">{number}</span>
        <Icon className="h-4 w-4 text-[#385640]" />
      </div>
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          <ArrowRight className="h-3.5 w-3.5 text-[#7c827e] transition group-hover:translate-x-1 group-hover:text-[#173622]" />
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#757c77]">{detail}</p>
      </div>
    </Link>
  );
}
