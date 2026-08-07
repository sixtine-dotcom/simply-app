import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { AddEnrollmentsForm } from "./add-enrollments-form";
import { EnrollmentList } from "./enrollment-list";

interface EnrollmentsPageProps {
  params: Promise<{ id: string }>;
}

export default async function EnrollmentsPage({ params }: EnrollmentsPageProps) {
  const { id: courseId } = await params;
  await requireAdminUser("/admin/courses");

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { position: "asc" },
        include: {
          lessons: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              videoDuration: true,
            },
          },
        },
      },
      enrollments: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!course) {
    notFound();
  }

  const progressRows = await db.progress.findMany({
    where: {
      userId: { in: course.enrollments.map((enrollment) => enrollment.user.id) },
      lesson: {
        module: {
          courseId,
        },
      },
    },
    select: {
      userId: true,
      lessonId: true,
      videoProgress: true,
      completedAt: true,
    },
  });

  const lessonMeta = new Map(
    course.modules.flatMap((courseModule) =>
      courseModule.lessons.map((lesson) => [
        lesson.id,
        {
          moduleId: courseModule.id,
          duration: lesson.videoDuration ?? 0,
        },
      ])
    )
  );

  const progressByUserAndLesson = new Map(
    progressRows.map((progress) => [`${progress.userId}:${progress.lessonId}`, progress])
  );

  const progressSummaryByUser = Object.fromEntries(
    course.enrollments.map((enrollment) => {
      const modules = course.modules.map((courseModule) => {
        const totalSeconds = courseModule.lessons.reduce(
          (total, lesson) => total + (lesson.videoDuration ?? 0),
          0
        );
        const watchedSeconds = courseModule.lessons.reduce((total, lesson) => {
          const progress = progressByUserAndLesson.get(`${enrollment.user.id}:${lesson.id}`);
          const duration = lessonMeta.get(lesson.id)?.duration ?? 0;
          const watched = progress?.completedAt && duration > 0
            ? duration
            : Math.min(progress?.videoProgress ?? 0, duration);

          return total + watched;
        }, 0);

        return {
          moduleId: courseModule.id,
          title: courseModule.title,
          percent: totalSeconds > 0 ? Math.round((watchedSeconds / totalSeconds) * 100) : 0,
        };
      });
      const modulePercents = modules.filter((module) => module.percent > 0 || course.modules.length > 0);
      const overallPercent = modulePercents.length > 0
        ? Math.round(modulePercents.reduce((total, module) => total + module.percent, 0) / modulePercents.length)
        : 0;

      return [
        enrollment.id,
        {
          overallPercent,
          modules,
        },
      ];
    })
  );

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="mb-8">
        <Link
          href={`/admin/courses/${courseId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Terug naar {course.title}
        </Link>
        <h1 className="font-display text-2xl tracking-wider">
          INSCHRIJVINGEN
        </h1>
        <p className="mt-1 text-muted-foreground">
          Wie heeft toegang tot &quot;{course.title}&quot;. Stel start- en einddatum in voor beperkte toegang (bijv. groep afgerond → cursus verdwijnt).
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deelnemers toevoegen</CardTitle>
            <p className="text-sm text-muted-foreground">
              Voer e-mailadressen in (één per regel) of kies bestaande gebruikers. Dezelfde persoon kan bij meerdere cursussen ingeschreven staan.
            </p>
          </CardHeader>
          <CardContent>
            <AddEnrollmentsForm courseId={courseId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingeschreven deelnemers ({course.enrollments.length})</CardTitle>
            <p className="text-sm text-muted-foreground">
              Na einddatum verdwijnt de cursus automatisch voor die deelnemer.
            </p>
          </CardHeader>
          <CardContent>
            <EnrollmentList
              courseId={courseId}
              enrollments={course.enrollments}
              progressSummaryByEnrollment={progressSummaryByUser}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
