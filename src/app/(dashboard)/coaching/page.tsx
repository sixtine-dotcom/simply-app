import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUserSessions } from "@/lib/coaching";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDateTime, formatRelativeTime, getInitials } from "@/lib/utils";
import { Calendar, Clock, Video, Download, User } from "lucide-react";
import { SessionCard } from "@/components/coaching/session-card";

export default async function CoachingPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  const [upcomingSessions, pastSessions] = await Promise.all([
    getUserSessions(user.id, user.role as "CLIENT" | "COACH" | "ADMIN", user.tenantId, {
      status: "scheduled",
      limit: 10,
    }),
    getUserSessions(user.id, user.role as "CLIENT" | "COACH" | "ADMIN", user.tenantId, {
      status: "completed",
      limit: 10,
    }),
  ]);

  const isClient = user.role === "CLIENT";
  const isCoach = user.role === "COACH" || user.role === "ADMIN";

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
      <div className="overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,242,233,0.82))] p-6 shadow-[0_24px_80px_-34px_rgba(50,32,14,0.28)] md:p-8">
        <p className="app-kicker">Coaching suite</p>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-slate-950 md:text-5xl">
          Coaching
        </h1>
        <p className="mt-3 text-muted-foreground">
          {isClient
            ? "Jouw coaching sessies, opvolging en opnames in één rustige omgeving."
            : "Beheer je coaching sessies en houd overzicht over je hele agenda."}
        </p>
      </div>

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-lg tracking-wider mb-4">
            AANKOMENDE SESSIES
          </h2>
          <div className="space-y-4">
            {upcomingSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                currentUser={user}
                isClient={isClient}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Sessions */}
      {pastSessions.length > 0 && (
        <div>
          <h2 className="font-display text-lg tracking-wider mb-4">
            AFGERONDE SESSIES
          </h2>
          <div className="space-y-4">
            {pastSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                currentUser={user}
                isClient={isClient}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {upcomingSessions.length === 0 && pastSessions.length === 0 && (
        <Card className="app-halo">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h2 className="mt-4 font-display text-xl tracking-wider">
              {isClient
                ? "GEEN SESSIES GEPLAND"
                : "GEEN SESSIES"}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-md mx-auto">
              {isClient
                ? "Je hebt nog geen coaching sessies. Neem contact op met je coach om een sessie in te plannen."
                : "Je hebt nog geen sessies gepland. Plan een nieuwe sessie via het admin menu."}
            </p>
            {isCoach && (
              <Button className="mt-4" asChild>
                <Link href="/admin/sessions/new">
                  Nieuwe sessie plannen
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
