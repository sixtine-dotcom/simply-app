import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUserSessions } from "@/lib/coaching";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { SessionCard } from "@/components/coaching/session-card";
import { AddSessionsToCalendar } from "@/components/coaching/add-sessions-to-calendar";

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
    <div className="relative min-h-screen overflow-hidden bg-white px-4 py-5 md:px-8 md:py-8">
      <div
        className="pointer-events-none fixed inset-0 bg-[url('/simply-community-background.jpg')] bg-cover bg-center bg-no-repeat"
        aria-hidden="true"
      />
      <div className="pointer-events-none fixed inset-0 bg-white/58" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl">
        <header className="mb-6 flex items-end justify-between border-b border-black/10 pb-5">
          <div>
            <h1 className="text-xl font-semibold text-[#181c19]">Coaching</h1>
            <p className="mt-1 text-xs text-[#68706a]">
              {isClient
                ? "Jouw sessies, opvolging en opnames."
                : "Beheer je coaching en agenda."}
            </p>
          </div>
          {isCoach ? (
            <Link
              href="/admin/sessions"
              className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737a75] transition hover:text-[#173622]"
            >
              Volledige agenda
            </Link>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737a75]">
              {upcomingSessions.length} gepland
            </span>
          )}
        </header>

        {isClient && upcomingSessions.length > 0 ? <AddSessionsToCalendar /> : null}

        <main className="space-y-8">
          {upcomingSessions.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[#181c19]">Aankomende sessies</h2>
              <div className="space-y-3">
                {upcomingSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    currentUser={user}
                    isClient={isClient}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {pastSessions.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[#181c19]">Afgeronde sessies</h2>
              <div className="space-y-3">
                {pastSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    currentUser={user}
                    isClient={isClient}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {upcomingSessions.length === 0 && pastSessions.length === 0 ? (
            <div className="rounded-2xl border border-black/10 bg-white px-5 py-12 text-center">
              <Calendar className="mx-auto h-5 w-5 text-slate-400" />
              <h2 className="mt-4 text-sm font-semibold text-slate-800">
                {isClient ? "Geen sessies gepland" : "Geen sessies"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">
                {isClient
                  ? "Je hebt nog geen coaching sessies. Neem contact op met je coach om een sessie in te plannen."
                  : "Je hebt nog geen sessies gepland. Plan een nieuwe sessie via je agenda."}
              </p>
              {isCoach ? (
                <Button className="mt-5 bg-[#173622] hover:bg-[#21492e]" asChild>
                  <Link href="/admin/sessions/new">Nieuwe sessie plannen</Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
