import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDateTime, formatRelativeTime, getInitials } from "@/lib/utils";
import { Calendar, Clock, Video, Download, User, FileText } from "lucide-react";
import { SessionWithDetails } from "@/lib/coaching";

interface SessionCardProps {
  session: SessionWithDetails;
  currentUser: {
    id: string;
    role: string;
  };
  isClient: boolean;
}

export function SessionCard({ session, currentUser, isClient }: SessionCardProps) {
  const isUpcoming = session.status === "scheduled";
  const isPast = session.status === "completed";
  const otherPerson = isClient ? session.coach : session.client;
  const canJoin = isUpcoming && session.roomUrl;
  const detailHref = isClient ? `/coaching/${session.id}` : `/admin/sessions/${session.id}`;
  const roomHref = isClient ? `/coaching/${session.id}/room` : `/coaching/${session.id}/room`;

  // Check if session is happening soon (within 15 minutes)
  const now = new Date();
  const sessionTime = new Date(session.scheduledAt);
  const timeUntilSession = sessionTime.getTime() - now.getTime();
  const canJoinNow = isUpcoming && timeUntilSession <= 15 * 60 * 1000 && timeUntilSession >= -session.duration * 60 * 1000;
  const endTime = new Date(sessionTime.getTime() + session.duration * 60 * 1000);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const roomUrl = `${appUrl}/coaching/${session.id}/room`;
  const calendarTitle = session.title || "Coaching sessie";
  const calendarDescription = [session.description, `Deelnemen: ${roomUrl}`]
    .filter(Boolean)
    .join("\n\n");
  const googleCalendarHref = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarTitle)}&dates=${formatCalendarDate(sessionTime)}/${formatCalendarDate(endTime)}&details=${encodeURIComponent(calendarDescription)}&location=${encodeURIComponent(roomUrl)}`;
  const outlookCalendarHref = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(calendarTitle)}&startdt=${encodeURIComponent(sessionTime.toISOString())}&enddt=${encodeURIComponent(endTime.toISOString())}&body=${encodeURIComponent(calendarDescription)}&location=${encodeURIComponent(roomUrl)}`;

  return (
    <Card className="overflow-hidden rounded-2xl border-black/10 bg-white shadow-none">
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Avatar & Info */}
          <Link href={detailHref} className="flex items-center gap-4 flex-1">
            <Avatar className="h-12 w-12">
              <AvatarImage src={otherPerson.avatarUrl || undefined} />
              <AvatarFallback>
                {getInitials(otherPerson.firstName, otherPerson.lastName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">
                  {session.title || "Coaching sessie"}
                </h3>
                {isUpcoming && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                    Gepland
                  </span>
                )}
                {isPast && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                    Afgerond
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>
                    {otherPerson.firstName} {otherPerson.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <time title={formatDateTime(session.scheduledAt)}>
                    {formatDateTime(session.scheduledAt)}
                  </time>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{session.duration} min</span>
                </div>
              </div>
              {session.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {session.description}
                </p>
              ) : null}
            </div>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {canJoinNow && (
              <Button asChild>
                <Link href={roomHref}>
                  <Video className="h-4 w-4 mr-2" />
                  Deelnemen
                </Link>
              </Button>
            )}

            {isUpcoming && !canJoinNow && (
              <Button variant="outline" asChild>
                <Link href={detailHref}>
                  Details
                </Link>
              </Button>
            )}

            {isUpcoming && (
              <>
              <Button variant="outline" size="icon" asChild>
                <a
                  href={`/api/sessions/${session.id}/calendar`}
                  download={`coaching-${session.id}.ics`}
                  title="Download naar agenda"
                >
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={googleCalendarHref} target="_blank" rel="noreferrer" title="Toevoegen aan Google Calendar">
                  <Calendar className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={outlookCalendarHref} target="_blank" rel="noreferrer" title="Toevoegen aan Outlook">
                  <Clock className="h-4 w-4" />
                </a>
              </Button>
              </>
            )}

            {isPast && (
              <Button variant="outline" asChild>
                <Link href={detailHref}>
                  <FileText className="h-4 w-4 mr-2" />
                  Bekijk notities
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatCalendarDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
