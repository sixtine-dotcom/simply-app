import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUserSessions } from "@/lib/coaching";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SessionCard } from "@/components/coaching/session-card";
import { Plus, Calendar, Users, CalendarDays } from "lucide-react";

export default async function AdminSessionsPage() {
  const user = await getCurrentUser();
  
  if (!user || (user.role !== "ADMIN" && user.role !== "COACH")) {
    redirect("/");
  }

  const [scheduledSessions, completedSessions] = await Promise.all([
    getUserSessions(user.id, user.role as "COACH" | "ADMIN", {
      status: "scheduled",
      limit: 50,
    }),
    getUserSessions(user.id, user.role as "COACH" | "ADMIN", {
      status: "completed",
      limit: 50,
    }),
  ]);

  // Get all clients for scheduling
  const clients = await db.user.findMany({
    where: {
      role: "CLIENT",
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
    orderBy: { firstName: "asc" },
  });

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl tracking-wider">
            COACHING SESSIES
          </h1>
          <p className="mt-2 text-muted-foreground">
            Beheer alle coaching sessies
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/sessions/new">
              <Plus className="mr-2 h-4 w-4" />
              Sessie met deelnemer
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/sessions/recurring-group">
              <CalendarDays className="mr-2 h-4 w-4" />
              Groepssessie plannen
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{scheduledSessions.length}</p>
              <p className="text-sm text-muted-foreground">Gepland</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{completedSessions.length}</p>
              <p className="text-sm text-muted-foreground">Afgerond</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{clients.length}</p>
              <p className="text-sm text-muted-foreground">Klanten</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Sessions */}
      {scheduledSessions.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-lg tracking-wider mb-4">
            AANKOMENDE SESSIES
          </h2>
          <div className="space-y-4">
            {scheduledSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                currentUser={user}
                isClient={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Sessions */}
      {completedSessions.length > 0 && (
        <div>
          <h2 className="font-display text-lg tracking-wider mb-4">
            AFGERONDE SESSIES
          </h2>
          <div className="space-y-4">
            {completedSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                currentUser={user}
                isClient={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {scheduledSessions.length === 0 && completedSessions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h2 className="mt-4 font-display text-xl tracking-wider">
              GEEN SESSIES
            </h2>
            <p className="mt-2 text-muted-foreground">
              Plan je eerste coaching sessie om te beginnen.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              <Button asChild>
                <Link href="/admin/sessions/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Sessie met deelnemer
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/sessions/recurring-group">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Groepssessie plannen
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
