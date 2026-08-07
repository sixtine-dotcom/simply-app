import Link from "next/link";
import {
  BookOpen,
  ExternalLink,
  GripVertical,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DuplicateCourseButton } from "./duplicate-button";
import { DeleteCourseButton } from "./delete-course-button";
import { PublishCourseButton } from "./publish-course-button";

interface AdminCoursesPageProps {
  searchParams?: Promise<{
    q?: string;
  }>;
}

function formatCount(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export default async function AdminCoursesPage({ searchParams }: AdminCoursesPageProps) {
  await requireAdminUser("/admin/courses");

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = resolvedSearchParams?.q?.trim() ?? "";

  const courses = await db.course.findMany({
    where: query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    include: {
      communitySpace: {
        select: {
          id: true,
          name: true,
        },
      },
      modules: {
        include: {
          lessons: {
            select: {
              id: true,
            },
          },
        },
      },
      _count: {
        select: {
          enrollments: true,
          progressPhotos: true,
          offerLinks: true,
        },
      },
    },
  });

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <section className="rounded-2xl border border-border bg-white px-5 py-4 shadow-sm md:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-950">Courses</h1>
            <p className="mt-1 text-sm text-muted-foreground">Beheer je cursussen en lesmateriaal.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/offers">
                Offers
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/admin/courses/new">
                <Plus className="mr-2 h-4 w-4" />
                Nieuwe course
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-3 flex flex-wrap gap-2">
        <Link href="/admin/courses" className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary">Courses</Link>
        <Link href="/admin/offers" className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Offers</Link>
        <Link href="/admin/community" className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Community</Link>
      </section>

      <section className="mt-4">
        <Card className="app-halo">
          <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">Cursussen</CardTitle>
              <CardDescription className="mt-1">{formatCount(courses.length, "product", "producten")}</CardDescription>
            </div>

            <form className="w-full md:max-w-xs">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={query}
                  placeholder="Zoek op titel of slug"
                  className="pl-9"
                />
              </div>
            </form>
          </CardHeader>

          <CardContent>
            {courses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/60" />
                <h2 className="mt-4 text-lg font-semibold">
                  {query ? "Geen cursussen gevonden" : "Je productbibliotheek is nog leeg"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {query
                    ? "Pas je zoekterm aan of maak een nieuw product aan."
                    : "Start met je eerste cursus, traject of premium programma."}
                </p>
                <Button className="mt-5" asChild>
                  <Link href="/admin/courses/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Eerste product aanmaken
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border bg-white">
                <div className="hidden grid-cols-[minmax(0,1fr)_180px_44px_150px] items-center border-b border-border bg-slate-50/70 px-4 py-2 text-[11px] font-medium text-muted-foreground lg:grid">
                  <span>Course</span><span>Status</span><span /><span className="text-right">Acties</span>
                </div>
                <div className="divide-y divide-border">
              {courses.map((course) => {
                const lessonCount = course.modules.reduce(
                  (sum, module) => sum + module.lessons.length,
                  0
                );

                return (
                  <div
                    key={course.id}
                    className="grid gap-3 px-3 py-3 transition-colors hover:bg-slate-50/60 lg:grid-cols-[minmax(0,1fr)_180px_44px_150px] lg:items-center lg:px-4"
                  >
                      <Link href={`/admin/courses/${course.id}`} className="flex min-w-0 items-center gap-3">
                        <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
                        <BookOpen className="h-6 w-6 shrink-0 text-slate-600" />

                        <div className="min-w-0 flex-1">
                          <h2 className="truncate text-sm font-semibold text-slate-800">{course.title}</h2>

                          <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                            <span>
                              {formatCount(course.modules.length, "module", "modules")}
                            </span>
                            <span>·</span><span>
                              {formatCount(lessonCount, "les", "lessen")}
                            </span>
                            <span>·</span><span>
                              {formatCount(course._count.enrollments, "inschrijving", "inschrijvingen")}
                            </span>
                          </div>
                        </div>
                      </Link>

                      <div className="flex items-center gap-2 text-sm">
                        <span className={course.isPublished ? "h-3 w-3 rounded-full bg-emerald-500" : "h-3 w-3 rounded-full bg-orange-500"} />
                        <span className="text-slate-600">{course.isPublished ? "Gepubliceerd" : "Concept"}</span>
                      </div>
                      <PublishCourseButton courseId={course.id} isPublished={course.isPublished} iconOnly />
                      <div className="flex items-center justify-end gap-0.5">
                        <DuplicateCourseButton courseId={course.id} variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" />
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" asChild><Link href={`/admin/courses/${course.id}`} title="Cursus bewerken"><Pencil className="h-4 w-4" /></Link></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" asChild><Link href={`/courses/${course.slug}`} target="_blank" title="Cursus bekijken"><ExternalLink className="h-4 w-4" /></Link></Button>
                        <DeleteCourseButton courseId={course.id} courseTitle={course.title} />
                      </div>
                  </div>
                );
              })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </section>
    </div>
  );
}
