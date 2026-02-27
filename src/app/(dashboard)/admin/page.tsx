import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  BarChart3,
  Calendar,
  UtensilsCrossed,
  MessageSquare,
  Mail,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const [userCount, clientCount, courseCount, enrollmentCount, progressCount] =
    await Promise.all([
      db.user.count({ where: { deletedAt: null } }),
      db.user.count({ where: { role: "CLIENT", deletedAt: null } }),
      db.course.count(),
      db.enrollment.count(),
      db.progress.count({ where: { completedAt: { not: null } } }),
    ]);

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl tracking-wider">
          ADMIN DASHBOARD
        </h1>
        <p className="mt-2 text-muted-foreground">
          Beheer gebruikers, cursussen en volg de progressie van je klanten
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Gebruikers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-2xl font-bold">{userCount}</p>
                <p className="text-sm text-muted-foreground">Totaal gebruikers</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{clientCount}</p>
                <p className="text-sm text-muted-foreground">Klanten</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/admin/users">
                  <Users className="mr-2 h-4 w-4" />
                  Gebruikers beheren
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Op de gebruikerspagina kun je gebruikers toevoegen en een CSV met klanten importeren.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Progressie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{progressCount}</p>
            <p className="text-sm text-muted-foreground">
              Lessen/video&apos;s bekeken (totaal)
            </p>
            <Button className="mt-4 w-full" variant="outline" asChild>
              <Link href="/admin/users">
                Progressie per klant bekijken
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Cursussen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{courseCount}</p>
            <p className="text-sm text-muted-foreground">
              {enrollmentCount} inschrijvingen
            </p>
            <Button className="mt-4 w-full" variant="outline" asChild>
              <Link href="/admin/courses">Cursussen beheren</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Sessies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/admin/sessions">Coaching-sessies</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Community
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/admin/community">Spaces beheren</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              Recepten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/admin/recipes">Recepten beheren</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Testmail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Stuur jezelf de welkomstmail zoals klanten die na een cursusaankoop krijgen.
            </p>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/admin/test-email">Testmail versturen</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
