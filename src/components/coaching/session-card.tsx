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

  // Check if session is happening soon (within 15 minutes)
  const now = new Date();
  const sessionTime = new Date(session.scheduledAt);
  const timeUntilSession = sessionTime.getTime() - now.getTime();
  const canJoinNow = isUpcoming && timeUntilSession <= 15 * 60 * 1000 && timeUntilSession >= -session.duration * 60 * 1000;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Avatar & Info */}
          <div className="flex items-center gap-4 flex-1">
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
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">
                    Gepland
                  </span>
                )}
                {isPast && (
                  <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">
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
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {canJoinNow && (
              <Button asChild>
                <Link href={`/coaching/${session.id}/room`}>
                  <Video className="h-4 w-4 mr-2" />
                  Deelnemen
                </Link>
              </Button>
            )}

            {isUpcoming && !canJoinNow && (
              <Button variant="outline" asChild>
                <Link href={`/coaching/${session.id}`}>
                  Details
                </Link>
              </Button>
            )}

            {isUpcoming && (
              <Button variant="outline" size="icon" asChild>
                <a
                  href={`/api/sessions/${session.id}/calendar`}
                  download={`coaching-${session.id}.ics`}
                  title="Download naar agenda"
                >
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            )}

            {isPast && (
              <Button variant="outline" asChild>
                <Link href={`/coaching/${session.id}`}>
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
