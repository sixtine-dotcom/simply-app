import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock, Clock } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function CoursesPage() {
  const user = await getCurrentUser();
  
  if (!user) return null;
  if (user.role === "ADMIN") redirect("/admin");

  // Fetch all enrollments with course details
  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    include: {
      course: {
        include: {
          modules: {
            include: {
              lessons: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // Calculate progress and status for each enrollment
  const coursesWithDetails = await Promise.all(
    enrollments.map(async (enrollment) => {
      const totalLessons = enrollment.course.modules.reduce(
        (acc, module) => acc + module.lessons.length,
        0
      );

      const completedLessons = await db.progress.count({
        where: {
          userId: user.id,
          lesson: {
            module: {
              courseId: enrollment.courseId
            }
          },
          completedAt: { not: null }
        }
      });

      const progressPercentage = totalLessons > 0 
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

      const now = new Date();
      const isExpired = enrollment.endDate && enrollment.endDate < now;
      const isNotStarted = enrollment.startDate > now;
      const daysRemaining = enrollment.endDate 
        ? Math.ceil((enrollment.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        ...enrollment,
        totalLessons,
        completedLessons,
        progressPercentage,
        isExpired,
        isNotStarted,
        daysRemaining
      };
    })
  );

  // Separate active and expired courses
  const activeCourses = coursesWithDetails.filter(c => !c.isExpired);
  const expiredCourses = coursesWithDetails.filter(c => c.isExpired);

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl tracking-wider">
          MIJN CURSUSSEN
        </h1>
        <p className="mt-2 text-muted-foreground">
          {activeCourses.length} actieve {activeCourses.length === 1 ? 'cursus' : 'cursussen'}
        </p>
      </div>

      {activeCourses.length === 0 && expiredCourses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Je bent nog niet ingeschreven voor cursussen.
            </p>
            <Button asChild>
              <a href="https://simplyinbalance.com" target="_blank" rel="noopener noreferrer">
                Bekijk programma&apos;s
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Courses */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeCourses.map((enrollment) => (
              <CourseCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </div>

          {/* Expired Courses */}
          {expiredCourses.length > 0 && (
            <div className="mt-12">
              <h2 className="font-display text-xl tracking-wider mb-6 text-muted-foreground">
                VERLOPEN TOEGANG
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {expiredCourses.map((enrollment) => (
                  <CourseCard key={enrollment.id} enrollment={enrollment} expired />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface CourseCardProps {
  enrollment: {
    id: string;
    course: {
      title: string;
      slug: string;
      description: string | null;
      thumbnailUrl: string | null;
      isPrivate: boolean;
    };
    startDate: Date;
    endDate: Date | null;
    progressPercentage: number;
    completedLessons: number;
    totalLessons: number;
    isNotStarted: boolean;
    daysRemaining: number | null;
  };
  expired?: boolean;
}

function CourseCard({ enrollment, expired }: CourseCardProps) {
  const { course, progressPercentage, completedLessons, totalLessons, isNotStarted, daysRemaining, startDate } = enrollment;

  return (
    <Card className={expired ? "opacity-60" : ""}>
      <CardContent className="p-0">
        {/* Thumbnail */}
        <div className="relative h-40 bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-lg">
          {course.thumbnailUrl ? (
            <img 
              src={course.thumbnailUrl} 
              alt={course.title}
              className="w-full h-full object-cover rounded-t-lg"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-3xl text-primary/30 tracking-widest">
                SIMPLY
              </span>
            </div>
          )}
          
          {/* Private badge */}
          {course.isPrivate && (
            <span className="absolute top-3 right-3 bg-primary text-white text-xs px-2 py-1 rounded">
              1-op-1
            </span>
          )}
          
          {/* Expired badge */}
          {expired && (
            <div className="absolute inset-0 bg-black/50 rounded-t-lg flex items-center justify-center">
              <span className="text-white font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Toegang verlopen
              </span>
            </div>
          )}
          
          {/* Not started badge */}
          {isNotStarted && !expired && (
            <div className="absolute inset-0 bg-black/30 rounded-t-lg flex items-center justify-center">
              <span className="text-white font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Start {formatDate(startDate)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-medium text-lg">{course.title}</h3>
          
          {!expired && !isNotStarted && (
            <>
              <div className="mt-4 flex items-center gap-3">
                <Progress value={progressPercentage} className="flex-1 h-2" />
                <span className="text-sm font-medium text-muted-foreground">
                  {progressPercentage}%
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {completedLessons} van {totalLessons} lessen voltooid
              </p>
            </>
          )}

          {daysRemaining !== null && !expired && (
            <p className="mt-2 text-sm text-muted-foreground">
              {daysRemaining > 0 
                ? `Nog ${daysRemaining} dagen toegang`
                : "Laatste dag!"
              }
            </p>
          )}

          {enrollment.endDate === null && !expired && (
            <p className="mt-2 text-sm text-muted-foreground">
              Onbeperkte toegang
            </p>
          )}

          <div className="mt-4">
            {expired ? (
              <Button variant="outline" className="w-full" disabled>
                Toegang verlopen
              </Button>
            ) : isNotStarted ? (
              <Button variant="outline" className="w-full" disabled>
                Nog niet beschikbaar
              </Button>
            ) : (
              <Button className="w-full" asChild>
                <Link href={`/courses/${course.slug}`}>
                  {progressPercentage > 0 ? "Ga verder" : "Start cursus"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
