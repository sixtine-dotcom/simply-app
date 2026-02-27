import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
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
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
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
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
