import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getProgressSummary } from "@/lib/trackers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  UtensilsCrossed, 
  Scale, 
  Droplet, 
  Heart, 
  Activity,
  TrendingUp,
  Calendar
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function TrackersPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  const summary = await getProgressSummary(user.id);

  const trackerCards = [
    {
      title: "Voeding",
      description: "Kcal en macro's bijhouden",
      icon: UtensilsCrossed,
      href: "/trackers/nutrition",
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      value: summary.todayNutrition.calories
        ? `${summary.todayNutrition.calories} kcal`
        : "Nog niet ingevuld",
    },
    {
      title: "Check-in",
      description: "Wekelijkse metingen en foto's",
      icon: Scale,
      href: "/trackers/checkins",
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      value: summary.latestCheckIn
        ? `Week ${summary.latestCheckIn.weekNumber}, ${summary.latestCheckIn.year}`
        : "Nog geen check-in",
    },
    {
      title: "Habits",
      description: "Water, stappen, suppletie",
      icon: Droplet,
      href: "/trackers/habits",
      color: "text-cyan-500",
      bgColor: "bg-cyan-50",
      value: summary.todayHabits.waterGlasses
        ? `${summary.todayHabits.waterGlasses} glazen`
        : "Nog niet ingevuld",
    },
    {
      title: "Cyclus",
      description: "Menstruatiecyclus tracking",
      icon: Heart,
      href: "/trackers/cycle",
      color: "text-pink-500",
      bgColor: "bg-pink-50",
      value: "Bijhouden",
    },
    {
      title: "Symptomen",
      description: "Energie, cravings, slaap, stemming",
      icon: Activity,
      href: "/trackers/symptoms",
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      value: summary.recentSymptoms
        ? formatDate(summary.recentSymptoms.date)
        : "Nog niet ingevuld",
    },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="app-panel app-halo mb-8 overflow-hidden">
        <p className="app-kicker">Progress command</p>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-slate-950 md:text-5xl">
          Mijn omgeving
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Track je voortgang en blijf gemotiveerd
        </p>
      </div>

      {/* Quick Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="app-halo">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <UtensilsCrossed className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {summary.todayNutrition.calories || 0}
                </p>
                <p className="text-sm text-muted-foreground">kcal vandaag</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="app-halo">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-cyan-100 flex items-center justify-center">
                <Droplet className="h-6 w-6 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {summary.todayHabits.waterGlasses || 0}
                </p>
                <p className="text-sm text-muted-foreground">glazen water</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="app-halo">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Scale className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {summary.latestCheckIn?.weight ? `${summary.latestCheckIn.weight} kg` : "-"}
                </p>
                <p className="text-sm text-muted-foreground">laatste check-in</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tracker Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {trackerCards.map((tracker) => {
          const Icon = tracker.icon;
          return (
            <Link key={tracker.href} href={tracker.href}>
              <Card className="app-halo h-full cursor-pointer transition-transform duration-200 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${tracker.bgColor}`}>
                    <Icon className={`h-6 w-6 ${tracker.color}`} />
                  </div>
                  <h3 className="mb-1 font-display text-lg tracking-tight text-slate-950">
                    {tracker.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {tracker.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{tracker.value}</span>
                    <Button variant="ghost" size="sm">
                      Openen →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Weekoverzicht + Progress Overview */}
      <div className="mt-8 space-y-4">
        <Card className="app-halo">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-lg tracking-tight">
                    Weekoverzicht
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Wat heb je bereikt? Deel op Instagram of TikTok
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link href="/trackers/weekly-overview">
                  <Calendar className="h-4 w-4 mr-2" />
                  Bekijk weekoverzicht
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="app-halo">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-lg tracking-tight">
                    Voortgang overzicht
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Bekijk je voortgang in grafieken en trends
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link href="/trackers/progress">
                  <Calendar className="h-4 w-4 mr-2" />
                  Bekijk voortgang
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
