import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  FileText,
  User,
  Video,
} from "lucide-react";
import { requireAdminOrCoachUser } from "@/lib/auth";
import { getSession } from "@/lib/coaching";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SessionNotes } from "@/components/coaching/session-notes";
import { SessionStatusActions } from "@/components/coaching/session-status-actions";
import { SessionEditForm } from "@/components/coaching/session-edit-form";
import { formatDateTime, getInitials } from "@/lib/utils";

export default async function AdminSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdminOrCoachUser("/admin/sessions");
  const { id } = await params;
  const session = await getSession(id, user.id, user.tenantId);

  if (!session) {
    notFound();
  }

  const isUpcoming = session.status === "scheduled";
  const otherPerson = session.client;
  const canJoinNow = (() => {
    const now = new Date();
    const sessionTime = new Date(session.scheduledAt);
    const timeUntilSession = sessionTime.getTime() - now.getTime();
    return (
      isUpcoming &&
      timeUntilSession <= 15 * 60 * 1000 &&
      timeUntilSession >= -session.duration * 60 * 1000
    );
  })();

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/admin/sessions"
          className="inline-flex items-center text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Terug naar sessies
        </Link>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={otherPerson.avatarUrl || undefined} />
                  <AvatarFallback>
                    {getInitials(otherPerson.firstName, otherPerson.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-semibold tracking-tight">
                      {session.title || "Coaching sessie"}
                    </h1>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {session.status}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>
                        Klant: {otherPerson.firstName} {otherPerson.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDateTime(session.scheduledAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{session.duration} minuten</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {canJoinNow ? (
                  <Button asChild>
                    <Link href={`/coaching/${session.id}/room`}>
                      <Video className="mr-2 h-4 w-4" />
                      Deelnemen
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" disabled={isUpcoming}>
                    <Video className="mr-2 h-4 w-4" />
                    {isUpcoming ? "Nog niet beschikbaar" : "Sessie voorbij"}
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <a
                    href={`/api/sessions/${session.id}/calendar`}
                    download={`coaching-${session.id}.ics`}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Agenda download
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/admin/users/${session.client.id}`}>Open klantprofiel</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Sessie notities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {session.notes.length > 0 ? (
                <SessionNotes notes={session.notes} />
              ) : (
                <p className="text-sm text-muted-foreground">Nog geen notities toegevoegd.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessie acties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <SessionStatusActions sessionId={session.id} status={session.status} />
              <SessionEditForm
                sessionId={session.id}
                title={session.title}
                description={session.description}
                scheduledAt={session.scheduledAt}
                duration={session.duration}
              />
              <div>
                <p className="mb-3 text-sm font-medium text-foreground">Nieuwe notitie</p>
                <SessionNotes sessionId={session.id} canAddNote />
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Sessie context</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Status</p>
                <p className="mt-2 text-lg font-semibold">{session.status}</p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Notities</p>
                <p className="mt-2 text-lg font-semibold">{session.notes.length}</p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Video room</p>
                <p className="mt-2 text-lg font-semibold">{session.roomUrl ? "Klaar" : "Nog niet aangemaakt"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
