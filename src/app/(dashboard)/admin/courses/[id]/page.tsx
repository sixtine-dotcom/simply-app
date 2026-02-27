import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CourseEditForm } from "./course-form";
import { ModuleList } from "./module-list";
import { ShopifyMappingCard } from "./shopify-mapping-card";
import { ChevronLeft, Eye, Users, Copy, Camera } from "lucide-react";

interface CourseEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseEditPage({ params }: CourseEditPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const course = await db.course.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: { position: "asc" },
        include: {
          lessons: {
            orderBy: { position: "asc" },
          },
        },
      },
      _count: {
        select: { enrollments: true },
      },
    },
  });

  if (!course) {
    notFound();
  }

  return (
    <div className="p-6 md:p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/admin/courses"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Terug naar cursussen
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl tracking-wider">
              {course.title.toUpperCase()}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {course._count.enrollments} inschrijvingen
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/courses/${course.slug}`} target="_blank">
                <Eye className="h-4 w-4 mr-2" />
                Bekijken
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/admin/courses/${id}/enrollments`}>
                <Users className="h-4 w-4 mr-2" />
                Inschrijvingen
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/admin/courses/${id}/progress-photos`}>
                <Camera className="h-4 w-4 mr-2" />
                Progressiefoto&apos;s
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Course Settings */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cursus instellingen</CardTitle>
            </CardHeader>
            <CardContent>
              <CourseEditForm course={course} />
            </CardContent>
          </Card>
          <ShopifyMappingCard courseId={course.id} />
        </div>

        {/* Modules & Lessons */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Modules & Lessen</CardTitle>
            </CardHeader>
            <CardContent>
              <ModuleList courseId={course.id} modules={course.modules} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
