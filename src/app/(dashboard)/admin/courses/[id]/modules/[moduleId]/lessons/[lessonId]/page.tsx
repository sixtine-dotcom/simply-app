import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { LessonEditForm } from "./lesson-form";
import { LessonAttachmentsSection } from "./lesson-attachments";

interface LessonEditPageProps {
  params: Promise<{ id: string; moduleId: string; lessonId: string }>;
}

export default async function LessonEditPage({ params }: LessonEditPageProps) {
  const { id: courseId, moduleId, lessonId } = await params;
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { include: { course: true } },
      attachments: true,
    },
  });

  if (!lesson || lesson.moduleId !== moduleId || lesson.module.courseId !== courseId) {
    notFound();
  }

  const course = lesson.module.course;

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-3xl">
      <div className="mb-8">
        <Link
          href={`/admin/courses/${courseId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Terug naar {course.title}
        </Link>
        <h1 className="font-display text-2xl tracking-wider">
          LES BEWERKEN
        </h1>
        <p className="mt-1 text-muted-foreground">
          {lesson.module.title} → {lesson.title}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inhoud & video (Loom)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Vul een Loom share-URL in (bijv. https://www.loom.com/share/xxx) om de video in de les te tonen.
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
    </div>
  );
}
