import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { ModuleEditForm } from "./module-form";

interface ModuleEditPageProps {
  params: Promise<{ id: string; moduleId: string }>;
}

export default async function ModuleEditPage({ params }: ModuleEditPageProps) {
  const { id: courseId, moduleId } = await params;
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const module = await db.module.findUnique({
    where: { id: moduleId },
    include: {
      course: true,
      lessons: { orderBy: { position: "asc" } },
    },
  });

  if (!module || module.courseId !== courseId) {
    notFound();
  }

  const course = module.course;

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-2xl">
      <div className="mb-8">
        <Link
          href={`/admin/courses/${courseId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Terug naar {course.title}
        </Link>
        <h1 className="font-display text-2xl tracking-wider">
          MODULE BEWERKEN
        </h1>
        <p className="mt-1 text-muted-foreground">
          Wanneer wordt deze module ontgrendeld? (dripping)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module: {module.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            &quot;Ontgrendel na X dagen&quot; telt vanaf de startdatum van de inschrijving van de deelnemer. Leeg = direct zichtbaar.
          </p>
        </CardHeader>
        <CardContent>
          <ModuleEditForm
            courseId={courseId}
            moduleId={moduleId}
            initialModule={{
              title: module.title,
              description: module.description,
              unlockAfterDays: module.unlockAfterDays,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
