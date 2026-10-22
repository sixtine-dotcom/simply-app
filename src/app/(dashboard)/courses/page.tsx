import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Clock, Lock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { getBlockingCourseFormsForUser } from "@/lib/forms";

export default async function CoursesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === "ADMIN") redirect("/admin");

  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    include: { course: { include: { modules: { include: { lessons: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  const blockingForms = await getBlockingCourseFormsForUser({
    userId: user.id,
    courseIds: enrollments.map((enrollment) => enrollment.courseId),
  });
  const coursesWithDetails = await Promise.all(
    enrollments.map(async (enrollment) => {
      const totalLessons = enrollment.course.modules.reduce((total, module) => total + module.lessons.length, 0);
      const completedLessons = await db.progress.count({
        where: {
          userId: user.id,
          lesson: { module: { courseId: enrollment.courseId } },
          completedAt: { not: null },
        },
      });
      const now = new Date();
      return {
        ...enrollment,
        totalLessons,
        completedLessons,
        progressPercentage: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
        isExpired: Boolean(enrollment.endDate && enrollment.endDate < now),
        isNotStarted: enrollment.startDate > now,
        daysRemaining: enrollment.endDate
          ? Math.ceil((enrollment.endDate.getTime() - now.getTime()) / 86400000)
          : null,
        accessGate: blockingForms.get(enrollment.courseId) || null,
      };
    })
  );
  const enrolledCourseIds = enrollments.map((enrollment) => enrollment.courseId);
  const lockedCourses = await db.course.findMany({
    where: {
      isPublished: true,
      hideForUnauthorized: false,
      id: enrolledCourseIds.length ? { notIn: enrolledCourseIds } : undefined,
    },
    orderBy: { title: "asc" },
    select: { id: true, title: true, thumbnailUrl: true, isPrivate: true },
  });
  const activeCourses = coursesWithDetails.filter((course) => !course.isExpired);
  const expiredCourses = coursesWithDetails.filter((course) => course.isExpired);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-6xl bg-white/94 px-4 backdrop-blur-[2px] sm:px-7 lg:px-10">
        <header className="grid gap-5 border-b border-black/10 pb-7 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <h1 className="text-[1.45rem] font-semibold tracking-[-0.025em] text-[#181d19]">Mijn programma&apos;s</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#68706a]">
              Al je lessen, trajecten en voortgang op één plek.
            </p>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#747b76]">
            {activeCourses.length} actief · {expiredCourses.length} afgerond
          </p>
        </header>

        {!activeCourses.length && !expiredCourses.length && !lockedCourses.length ? (
          <div className="border-b border-black/10 py-20 text-center">
            <BookOpen className="mx-auto h-6 w-6 text-[#7b827d]" />
            <h2 className="mt-4 text-base font-semibold">Nog geen programma beschikbaar</h2>
            <p className="mt-2 text-sm text-[#707772]">Zodra je traject start, verschijnt het hier automatisch.</p>
            <a href="https://simplyinbalance.com" target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex h-11 items-center gap-2 bg-[#173622] px-5 text-sm font-semibold text-white">
              Bekijk programma&apos;s <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        ) : null}

        {activeCourses.length ? (
          <section className="py-9">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold">Actieve programma&apos;s</h2>
              <span className="text-xs text-[#7a817c]">Ga verder waar je gebleven bent</span>
            </div>
            <div className="divide-y divide-black/10 border-y border-black/10">
              {activeCourses.map((enrollment, index) => (
                <CourseRow key={enrollment.id} enrollment={enrollment} featured={index === 0} />
              ))}
            </div>
          </section>
        ) : null}

        {expiredCourses.length ? (
          <section className="border-t border-black/10 py-9">
            <h2 className="mb-5 text-base font-semibold text-[#4e5650]">Eerdere programma&apos;s</h2>
            <div className="divide-y divide-black/10 border-y border-black/10 opacity-70">
              {expiredCourses.map((enrollment) => <CourseRow key={enrollment.id} enrollment={enrollment} expired />)}
            </div>
          </section>
        ) : null}

        {lockedCourses.length ? (
          <section className="border-t border-black/10 py-9">
            <h2 className="mb-5 text-base font-semibold text-[#4e5650]">Andere programma&apos;s</h2>
            <div className="divide-y divide-black/10 border-y border-black/10">
              {lockedCourses.map((course) => (
                <div key={course.id} className="grid gap-4 py-5 sm:grid-cols-[72px_1fr_auto] sm:items-center">
                  <div className="relative h-16 overflow-hidden bg-[#eff1ec]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={course.thumbnailUrl || "/simply-dashboard-plant.jpg"} alt="" className="h-full w-full object-cover opacity-65" />
                  </div>
                  <div><h3 className="text-sm font-semibold">{course.title}</h3><p className="mt-1 text-xs text-[#747b76]">Beschikbaar zodra je toegang krijgt.</p></div>
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-[#747b76]"><Lock className="h-3.5 w-3.5" /> Op slot</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

type EnrollmentRow = {
  id: string;
  endDate: Date | null;
  startDate: Date;
  course: { title: string; slug: string; description: string | null; thumbnailUrl: string | null; isPrivate: boolean };
  progressPercentage: number;
  completedLessons: number;
  totalLessons: number;
  isNotStarted: boolean;
  daysRemaining: number | null;
  accessGate: { formSlug: string; formTitle: string } | null;
};

function CourseRow({ enrollment, expired = false, featured = false }: { enrollment: EnrollmentRow; expired?: boolean; featured?: boolean }) {
  const { course, progressPercentage, completedLessons, totalLessons, isNotStarted, daysRemaining, startDate, accessGate } = enrollment;
  const href = expired
    ? null
    : accessGate
      ? `/forms/${accessGate.formSlug}`
      : isNotStarted
        ? null
        : `/courses/${course.slug}`;
  const label = expired ? "Toegang verlopen" : accessGate ? "Intake invullen" : isNotStarted ? `Start ${formatDate(startDate)}` : progressPercentage ? "Ga verder" : "Start programma";

  const content = (
    <div className={cnRow(featured)}>
      <div className="relative min-h-[170px] overflow-hidden bg-[#eff1ec] sm:min-h-[190px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={course.thumbnailUrl || "/simply-dashboard-plant.jpg"} alt={course.title} className="absolute inset-0 h-full w-full object-cover" />
        {(expired || isNotStarted || accessGate) ? <div className="absolute inset-0 bg-white/45" /> : null}
      </div>
      <div className="flex flex-col justify-between py-5 sm:py-6">
        <div>
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#737a75]">
            <span>{course.isPrivate ? "Persoonlijk traject" : "Programma"}</span>
            {daysRemaining !== null && !expired ? <span>· {daysRemaining > 0 ? `${daysRemaining} dagen toegang` : "Laatste dag"}</span> : null}
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-[-0.025em] text-[#181d19]">{course.title}</h3>
          <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-[#68706a]">{course.description || "Je persoonlijke traject binnen Simply in Balance."}</p>
        </div>
        {!expired && !isNotStarted && !accessGate ? (
          <div className="mt-7 max-w-xl">
            <div className="flex justify-between text-[10px] font-medium text-[#737a75]"><span>{completedLessons} van {totalLessons} lessen</span><span>{progressPercentage}%</span></div>
            <div className="mt-2 h-px bg-black/10"><div className="h-px bg-[#173622]" style={{ width: `${progressPercentage}%` }} /></div>
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-black/10 py-4 sm:block sm:border-l sm:border-t-0 sm:py-6 sm:pl-5">
        <span className="text-xs font-semibold text-[#173622]">{label}</span>
        {href ? <ArrowRight className="mt-0 h-4 w-4 text-[#173622] sm:mt-4" /> : <Lock className="mt-0 h-4 w-4 text-[#747b76] sm:mt-4" />}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block transition hover:bg-[#fafaf8]">{content}</Link> : content;
}

function cnRow(featured: boolean) {
  return featured
    ? "grid gap-0 sm:grid-cols-[260px_minmax(0,1fr)_145px] sm:gap-6"
    : "grid gap-0 sm:grid-cols-[210px_minmax(0,1fr)_145px] sm:gap-6";
}
