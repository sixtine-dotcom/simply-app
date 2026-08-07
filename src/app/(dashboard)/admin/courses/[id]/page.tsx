import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Camera,
  CalendarDays,
  ChevronLeft,
  Eye,
  Users,
} from "lucide-react";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CourseEditForm } from "./course-form";
import { CourseDrippingForm } from "./course-dripping-form";
import { ModuleList } from "./module-list";
import { ShopifyMappingCard } from "./shopify-mapping-card";
import { DuplicateCourseButton } from "../duplicate-button";
import { NutritionIntakeCard } from "./nutrition-intake-card";
import { NutritionPlanTemplatesCard } from "./nutrition-plan-templates-card";
import { PublishCourseButton } from "../publish-course-button";
import { DeleteCourseButton } from "../delete-course-button";

const COURSE_TABS = [
  { id: "settings", label: "Settings" },
  { id: "builder", label: "Builder" },
  { id: "students", label: "Students" },
  { id: "dripping", label: "Dripping" },
] as const;

type CourseTab = (typeof COURSE_TABS)[number]["id"];

function getTab(value: string | undefined): CourseTab {
  return COURSE_TABS.some((tab) => tab.id === value) ? (value as CourseTab) : "builder";
}

interface CourseEditPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

export default async function CourseEditPage({ params, searchParams }: CourseEditPageProps) {
  const { id } = await params;
  await requireAdminUser("/admin/courses");
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activeTab = getTab(resolvedSearchParams?.tab);

  const course = await db.course.findUnique({
    where: { id },
    include: {
      communitySpace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
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
      formAssignments: {
        where: { blocksCourseAccess: true, isActive: true },
        select: { formId: true },
        take: 1,
      },
      nutritionPlanTemplates: {
        where: { isActive: true },
        select: { biologicalSex: true, title: true, fileUrl: true },
      },
    },
  });

  if (!course) {
    notFound();
  }

  const [spaces, coaches] = await Promise.all([
    db.space.findMany({
      orderBy: { position: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    db.user.findMany({
      where: {
        role: { in: ["ADMIN", "COACH", "STAFF"] },
        deletedAt: null,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, role: true },
    }),
  ]);

  return (
    <div className="p-3 md:p-4 lg:p-5">
      <div className="mx-auto max-w-7xl space-y-2">
        <section className="rounded-xl border border-border bg-white px-3 py-2.5 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href="/admin/courses"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Terug naar courses"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold leading-5 text-slate-950">
                  {course.title}
                </h1>
                <p className={course.isPublished ? "mt-0.5 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold leading-4 text-emerald-800" : "mt-0.5 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold leading-4 text-slate-600"}>{course.isPublished ? "Gepubliceerd en actief" : "Niet gepubliceerd"}</p>
              </div>
            </div>

                <div className="flex flex-wrap gap-1">
                  <PublishCourseButton courseId={course.id} isPublished={course.isPublished} />
                  <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" asChild>
                    <Link href={`/courses/${course.slug}`} target="_blank">
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Bekijken
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" asChild><Link href={`/admin/courses/${id}/enrollments`}><Users className="mr-1.5 h-3.5 w-3.5" />Inschrijvingen</Link></Button>
                  <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" asChild><Link href={`/admin/courses/${id}/progress-photos`}><Camera className="mr-1.5 h-3.5 w-3.5" />Foto&apos;s</Link></Button>
                  <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" asChild><Link href={`/admin/sessions/recurring-group?courseId=${id}`}><CalendarDays className="mr-1.5 h-3.5 w-3.5" />Groepssessie</Link></Button>
                  <DuplicateCourseButton courseId={course.id} label="Dupliceren" className="h-8 px-2.5 text-xs" />
                  <DeleteCourseButton courseId={course.id} courseTitle={course.title} redirectAfterDelete />
                </div>
            </div>
        </section>

        <section className="flex flex-wrap gap-1.5">
        {COURSE_TABS.map((tab) => (
            <Link
              key={tab.id}
              href={`/admin/courses/${course.id}?tab=${tab.id}`}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition",
                activeTab === tab.id
                  ? "border-stone-950 bg-stone-950 text-white"
                  : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.label}
            </Link>
          ))}
        </section>

        {activeTab === "settings" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
            <div className="space-y-6">
              <Card className="app-halo">
                <CardHeader>
                  <CardTitle>Course settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <CourseEditForm course={course} spaces={spaces} coaches={coaches} />
                </CardContent>
              </Card>

            </div>

            <div className="space-y-6">
              <NutritionIntakeCard
                courseId={course.id}
                formId={course.formAssignments[0]?.formId || null}
              />
              <NutritionPlanTemplatesCard
                courseId={course.id}
                initialTemplates={course.nutritionPlanTemplates}
              />
              <ShopifyMappingCard courseId={course.id} />
            </div>
          </div>
        ) : null}

        {activeTab === "builder" ? (
          <div>
            <Card className="border-border bg-white shadow-sm">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base">Lessenbouwer</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <ModuleList courseId={course.id} modules={course.modules} />
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === "students" ? (
          <Card className="app-halo">
            <CardHeader>
              <CardTitle>Student management</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <Link href={`/admin/courses/${id}/enrollments`}>Open enrollments</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/admin/courses/${id}/progress-photos`}>Open progress photos</Link>
                </Button>
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "dripping" ? (
          <CourseDrippingForm
            course={{
              id: course.id,
              drippingEnabled: course.drippingEnabled,
              drippingUnit: course.drippingUnit,
              drippingStartMode: course.drippingStartMode,
              drippingReleaseWeekday: course.drippingReleaseWeekday,
              drippingReleaseTime: course.drippingReleaseTime,
            }}
            modules={course.modules.map((module) => ({
              id: module.id,
              title: module.title,
              unlockAfterDays: module.unlockAfterDays,
              lessons: module.lessons.map((lesson) => ({
                id: lesson.id,
                title: lesson.title,
                unlockAfterDays: lesson.unlockAfterDays,
              })),
            }))}
          />
        ) : null}
      </div>
    </div>
  );
}
