import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { 
  Plus, 
  Search, 
  MoreVertical,
  BookOpen,
  Users,
  Eye,
  EyeOff,
  Lock,
  Copy,
  Pencil,
  FileJson
} from "lucide-react";
import { DuplicateCourseButton } from "./duplicate-button";

export default async function AdminCoursesPage() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const courses = await db.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          modules: true,
          enrollments: true,
        },
      },
      modules: {
        include: {
          _count: {
            select: { lessons: true },
          },
        },
      },
    },
  });

  const stats = {
    total: courses.length,
    published: courses.filter((c) => c.isPublished).length,
    private: courses.filter((c) => c.isPrivate).length,
    totalEnrollments: courses.reduce((acc, c) => acc + c._count.enrollments, 0),
  };

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl tracking-wider">
            CURSUSSEN
          </h1>
          <p className="mt-2 text-muted-foreground">
            Beheer je cursussen en programma&apos;s
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/courses/import">
              <FileJson className="mr-2 h-4 w-4" />
              Cursus importeren
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/courses/new">
              <Plus className="mr-2 h-4 w-4" />
              Nieuwe cursus
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Cursussen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.published}</p>
              <p className="text-sm text-muted-foreground">Gepubliceerd</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.private}</p>
              <p className="text-sm text-muted-foreground">1-op-1 Trajecten</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalEnrollments}</p>
              <p className="text-sm text-muted-foreground">Inschrijvingen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek cursus..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Courses List */}
      <div className="space-y-4">
        {courses.map((course) => {
          const totalLessons = course.modules.reduce(
            (acc, m) => acc + m._count.lessons,
            0
          );

          return (
            <Card key={course.id}>
              <CardContent className="p-0">
                <div className="flex items-center gap-4 p-5">
                  {/* Thumbnail */}
                  <div className="w-24 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                    {course.thumbnailUrl ? (
                      <img 
                        src={course.thumbnailUrl} 
                        alt={course.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <BookOpen className="h-6 w-6 text-primary/50" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{course.title}</h3>
                      {course.isPrivate && (
                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded">
                          <Lock className="h-3 w-3 inline mr-1" />
                          1-op-1
                        </span>
                      )}
                      {!course.isPublished && (
                        <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded">
                          <EyeOff className="h-3 w-3 inline mr-1" />
                          Concept
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{course._count.modules} modules</span>
                      <span>{totalLessons} lessen</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {course._count.enrollments}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/courses/${course.id}`}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Bewerken
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/courses/${course.slug}`} target="_blank">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <DuplicateCourseButton courseId={course.id} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {courses.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h2 className="mt-4 font-medium">Nog geen cursussen</h2>
              <p className="mt-2 text-muted-foreground">
                Maak je eerste cursus aan om te beginnen.
              </p>
              <Button className="mt-4" asChild>
                <Link href="/admin/courses/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Nieuwe cursus
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

