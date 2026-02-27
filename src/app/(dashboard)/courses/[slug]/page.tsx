import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getCourseWithProgress } from "@/lib/courses";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronDown,
  ChevronRight,
  CheckCircle2, 
  Circle, 
  Lock,
  PlayCircle,
  Clock,
  Video
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }
  if (user.role === "ADMIN") redirect("/admin");

  const course = await getCourseWithProgress(slug, user.id);

  if (!course) {
    notFound();
  }

  // Find the first incomplete, unlocked lesson to continue
  let continueLesson: { moduleId: string; lessonId: string } | null = null;
  for (const module of course.modules) {
    if (module.isLocked) continue;
    for (const lesson of module.lessons) {
      if (!lesson.isLocked && !lesson.isCompleted) {
        continueLesson = { moduleId: module.id, lessonId: lesson.id };
        break;
      }
    }
    if (continueLesson) break;
  }

  // If all complete, use the last lesson
  if (!continueLesson && course.modules.length > 0) {
    const lastModule = course.modules[course.modules.length - 1];
    if (lastModule.lessons.length > 0 && !lastModule.isLocked) {
      continueLesson = {
        moduleId: lastModule.id,
        lessonId: lastModule.lessons[lastModule.lessons.length - 1].id,
      };
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="p-6 md:p-8 lg:p-12">
          <Link 
            href="/courses"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Terug naar cursussen
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {course.isPrivate && (
                  <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded">
                    1-op-1 Traject
                  </span>
                )}
                {course.enrollment.daysRemaining !== null && (
                  <span className="bg-warning/10 text-warning text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Nog {course.enrollment.daysRemaining} dagen
                  </span>
                )}
              </div>
              
              <h1 className="font-display text-2xl md:text-3xl tracking-wider">
                {course.title.toUpperCase()}
              </h1>
              
              {course.description && (
                <p className="mt-3 text-muted-foreground max-w-2xl">
                  {course.description}
                </p>
              )}

              <div className="mt-6 flex items-center gap-4">
                <div className="flex-1 max-w-xs">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Voortgang</span>
                    <span className="font-medium">{course.progressPercentage}%</span>
                  </div>
                  <Progress value={course.progressPercentage} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-1">
                    {course.completedLessons} van {course.totalLessons} lessen voltooid
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {continueLesson && (
                <Button size="lg" asChild>
                  <Link href={`/courses/${slug}/lessons/${continueLesson.lessonId}`}>
                    {course.progressPercentage > 0 ? "Ga verder" : "Start cursus"}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
              {course.hasCommunity && (
                <Button size="lg" variant="outline" asChild>
                  <Link href={`/courses/${slug}/coachings`}>
                    <Video className="mr-2 h-4 w-4" />
                    Coachings & opnames
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="p-6 md:p-8 lg:p-12">
        <div className="max-w-3xl space-y-4">
          {course.modules.map((module, moduleIndex) => (
            <ModuleCard 
              key={module.id} 
              module={module} 
              courseSlug={slug}
              moduleNumber={moduleIndex + 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ModuleCardProps {
  module: {
    id: string;
    title: string;
    description: string | null;
    isLocked: boolean;
    unlocksAt: Date | null;
    lessons: {
      id: string;
      title: string;
      isCompleted: boolean;
      isLocked: boolean;
      unlocksAt: Date | null;
      videoUrl: string | null;
    }[];
    completedCount: number;
    totalCount: number;
  };
  courseSlug: string;
  moduleNumber: number;
}

function ModuleCard({ module, courseSlug, moduleNumber }: ModuleCardProps) {
  const isComplete = module.completedCount === module.totalCount && module.totalCount > 0;
  const isStarted = module.completedCount > 0;

  return (
    <Card className={module.isLocked ? "opacity-75" : ""}>
      <CardContent className="p-0">
        {/* Module Header */}
        <div className="p-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
              ${isComplete 
                ? "bg-success text-white" 
                : module.isLocked 
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary/10 text-primary"
              }
            `}>
              {module.isLocked ? (
                <Lock className="h-4 w-4" />
              ) : isComplete ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                moduleNumber
              )}
            </div>
            <div>
              <h3 className="font-medium">{module.title}</h3>
              {module.isLocked && module.unlocksAt ? (
                <p className="text-sm text-muted-foreground">
                  Beschikbaar vanaf {formatDate(module.unlocksAt)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {module.completedCount} van {module.totalCount} lessen
                </p>
              )}
            </div>
          </div>
          
          {!module.isLocked && (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Lessons */}
        {!module.isLocked && (
          <div className="divide-y">
            {module.lessons.map((lesson) => (
              <LessonRow 
                key={lesson.id} 
                lesson={lesson} 
                courseSlug={courseSlug}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface LessonRowProps {
  lesson: {
    id: string;
    title: string;
    isCompleted: boolean;
    isLocked: boolean;
    unlocksAt: Date | null;
    videoUrl: string | null;
  };
  courseSlug: string;
}

function LessonRow({ lesson, courseSlug }: LessonRowProps) {
  const content = (
    <div className={`
      flex items-center gap-4 p-4 transition-colors
      ${lesson.isLocked 
        ? "opacity-50 cursor-not-allowed" 
        : "hover:bg-muted/50 cursor-pointer"
      }
    `}>
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {lesson.isLocked ? (
          <Lock className="h-5 w-5 text-muted-foreground" />
        ) : lesson.isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-success" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className={`truncate ${lesson.isCompleted ? "text-muted-foreground" : ""}`}>
          {lesson.title}
        </p>
        {lesson.isLocked && lesson.unlocksAt && (
          <p className="text-xs text-muted-foreground">
            Beschikbaar vanaf {formatDate(lesson.unlocksAt)}
          </p>
        )}
      </div>

      {/* Video indicator */}
      {lesson.videoUrl && !lesson.isLocked && (
        <PlayCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      )}

      {/* Arrow */}
      {!lesson.isLocked && (
        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      )}
    </div>
  );

  if (lesson.isLocked) {
    return content;
  }

  return (
    <Link href={`/courses/${courseSlug}/lessons/${lesson.id}`}>
      {content}
    </Link>
  );
}
