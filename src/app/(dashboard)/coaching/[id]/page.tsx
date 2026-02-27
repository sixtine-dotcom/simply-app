import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getSession } from "@/lib/coaching";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDateTime, getInitials } from "@/lib/utils";
import { ChevronLeft, Calendar, Clock, Video, Download, User, FileText } from "lucide-react";
import { SessionNotes } from "@/components/coaching/session-notes";

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  const session = await getSession(id, user.id);

  if (!session) {
    notFound();
  }

  const isUpcoming = session.status === "scheduled";
  const isPast = session.status === "completed";
  const isClient = user.role === "CLIENT";
  const isCoach = user.role === "COACH" || user.role === "ADMIN";
  const otherPerson = isClient ? session.coach : session.client;

  // Check if session can be joined now
  const now = new Date();
  const sessionTime = new Date(session.scheduledAt);
  const timeUntilSession = sessionTime.getTime() - now.getTime();
  const canJoinNow = isUpcoming && timeUntilSession <= 15 * 60 * 1000 && timeUntilSession >= -session.duration * 60 * 1000;

  // Filter notes based on sharing
  const visibleNotes = session.notes.filter(
    (note) => note.isSharedWithClient || isCoach
  );

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-4xl mx-auto">
      {/* Back link */}
      <Link 
        href="/coaching"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar coaching
      </Link>

      {/* Session Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <Avatar className="h-16 w-16">
              <AvatarImage src={otherPerson.avatarUrl || undefined} />
              <AvatarFallback>
                {getInitials(otherPerson.firstName, otherPerson.lastName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-display text-2xl tracking-wider">
                  {session.title || "Coaching sessie"}
                </h1>
                {isUpcoming && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
                    Gepland
                  </span>
                )}
                {isPast && (
                  <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                    Afgerond
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>
                    {isClient ? "Coach" : "Klant"}: {otherPerson.firstName}{" "}
                    {otherPerson.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <time title={formatDateTime(session.scheduledAt)}>
                    {formatDateTime(session.scheduledAt)}
                  </time>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{session.duration} minuten</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {canJoinNow && (
                <Button asChild className="w-full">
                  <Link href={`/coaching/${session.id}/room`}>
                    <Video className="h-4 w-4 mr-2" />
                    Deelnemen aan sessie
                  </Link>
                </Button>
              )}

              {isUpcoming && !canJoinNow && (
                <Button variant="outline" disabled className="w-full">
                  <Video className="h-4 w-4 mr-2" />
                  Nog niet beschikbaar
                </Button>
              )}

              {isUpcoming && (
                <Button variant="outline" asChild className="w-full">
                  <a
                    href={`/api/sessions/${session.id}/calendar`}
                    download={`coaching-${session.id}.ics`}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download naar agenda
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Notes */}
      {visibleNotes.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-display text-lg tracking-wider flex items-center gap-2">
              <FileText className="h-5 w-5" />
              SESSIE NOTITIES
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SessionNotes notes={visibleNotes} />
          </CardContent>
        </Card>
      )}

      {/* Add Note (Coach only) */}
      {isCoach && isPast && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg tracking-wider">
              NOTITIE TOEVOEGEN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SessionNotes sessionId={session.id} canAddNote={true} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
