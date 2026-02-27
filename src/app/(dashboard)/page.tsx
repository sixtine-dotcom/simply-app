import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Users, 
  Calendar, 
  Droplets, 
  Dumbbell,
  ArrowRight,
  MessageSquare,
  Bot
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  // Admins land on admin dashboard (zoals Huddle)
  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  // Fetch user's enrollments with course info
  const enrollments = await db.enrollment.findMany({
    where: { 
      userId: user.id,
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } }
      ]
    },
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
    take: 3
  });

  // Calculate progress for each enrollment
  const coursesWithProgress = await Promise.all(
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

      return {
        ...enrollment,
        totalLessons,
        completedLessons,
        progressPercentage
      };
    })
  );

  // Fetch upcoming sessions
  const upcomingSessions = await db.coachingSession.findMany({
    where: {
      clientId: user.id,
      scheduledAt: { gte: new Date() },
      status: "scheduled"
    },
    include: {
      coach: true
    },
    orderBy: { scheduledAt: "asc" },
    take: 1
  });

  // Fetch today's habit log
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayHabitLog = await db.habitLog.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date: today
      }
    }
  });

  // Fetch today's nutrition log
  const todayNutritionLog = await db.nutritionLog.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date: today
      }
    }
  });

  // Check if weekly check-in is done
  const currentWeek = getWeekNumber(new Date());
  const weeklyCheckIn = await db.checkIn.findUnique({
    where: {
      userId_weekNumber_year: {
        userId: user.id,
        weekNumber: currentWeek.week,
        year: currentWeek.year
      }
    }
  });

  return (
    <div className="p-6 md:p-8 lg:p-12">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl tracking-wider text-foreground">
          WELKOM TERUG, {user.firstName.toUpperCase()}!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Hier is je overzicht voor vandaag
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Courses Section */}
        <Card className="md:col-span-2 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Mijn Cursussen
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/courses">
                Alles bekijken
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {coursesWithProgress.length > 0 ? (
              <div className="space-y-4">
                {coursesWithProgress.map((enrollment) => (
                  <Link 
                    key={enrollment.id}
                    href={`/courses/${enrollment.course.slug}`}
                    className="block"
                  >
                    <div className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">
                          {enrollment.course.title}
                        </h3>
                        <div className="mt-2 flex items-center gap-2">
                          <Progress 
                            value={enrollment.progressPercentage} 
                            className="h-2 flex-1"
                          />
                          <span className="text-sm text-muted-foreground">
                            {enrollment.progressPercentage}%
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {enrollment.completedLessons} van {enrollment.totalLessons} lessen
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                Je bent nog niet ingeschreven voor cursussen.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Session */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Coaching
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length > 0 ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="text-sm text-muted-foreground">Volgende sessie</p>
                  <p className="mt-1 font-medium">
                    {formatSessionDate(upcomingSessions[0].scheduledAt)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    met {upcomingSessions[0].coach.firstName}
                  </p>
                </div>
                <Button className="w-full" asChild>
                  <Link href="/coaching">Bekijk details</Link>
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Geen aankomende sessies gepland
              </p>
            )}
          </CardContent>
        </Card>

        {/* Daily Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Dagelijkse Check
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Water */}
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    Water
                  </span>
                  <span className="text-muted-foreground">
                    {todayHabitLog?.waterGlasses || 0}/8 glazen
                  </span>
                </div>
                <Progress 
                  value={((todayHabitLog?.waterGlasses || 0) / 8) * 100} 
                  className="mt-2 h-2"
                />
              </div>

              {/* Protein */}
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span>Eiwit</span>
                  <span className="text-muted-foreground">
                    {todayNutritionLog?.protein || 0}g / 120g
                  </span>
                </div>
                <Progress 
                  value={((todayNutritionLog?.protein || 0) / 120) * 100} 
                  className="mt-2 h-2"
                />
              </div>

              {/* Supplements */}
              <div className="flex items-center justify-between">
                <span className="text-sm">Suppletie</span>
                <span className={`text-sm ${todayHabitLog?.supplements ? 'text-success' : 'text-muted-foreground'}`}>
                  {todayHabitLog?.supplements ? '✓ Genomen' : 'Nog niet'}
                </span>
              </div>

              <Button variant="outline" className="w-full" asChild>
                <Link href="/trackers">Bijwerken</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Check-in Reminder */}
        <Card className={!weeklyCheckIn ? 'border-warning' : ''}>
          <CardHeader>
            <CardTitle className="text-base">Wekelijkse Check-in</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyCheckIn ? (
              <div className="flex items-center gap-2 text-success">
                <span>✓</span>
                <span className="text-sm">Deze week ingevuld</span>
              </div>
            ) : (
              <div>
                <p className="text-sm text-warning mb-3">
                  ⚠️ Nog niet ingevuld deze week
                </p>
                <Button className="w-full" asChild>
                  <Link href="/trackers/checkins">Nu invullen</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Community Updates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Community
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/community">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Bekijk updates
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/messages">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Berichten
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SIX AI */}
        <Card className="bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              SIX AI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Heb je een vraag? SIX helpt je graag!
            </p>
            <Button className="w-full" asChild>
              <Link href="/six">
                Stel een vraag
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

function formatSessionDate(date: Date): string {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}
