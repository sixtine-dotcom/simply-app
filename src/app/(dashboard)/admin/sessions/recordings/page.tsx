import Link from "next/link";
import { Download, ExternalLink, FileText, Video } from "lucide-react";
import { requireAdminOrCoachUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";

export default async function CoachRecordingsPage() {
  const user = await requireAdminOrCoachUser("/admin/sessions/recordings");
  const recordings = await db.coachingRecording.findMany({
    where:
      user.role === "ADMIN" || user.role === "SUPERADMIN"
        ? {}
        : {
            OR: [
              { coachId: user.id },
              { course: { coachId: user.id } },
              { session: { coachId: user.id } },
            ],
          },
    include: {
      course: { select: { title: true } },
      session: {
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          client: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <div className="min-h-screen bg-white p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Coachingsessies</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Coach-only overzicht van calls, opnames, samenvattingen en transcripties.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/admin/sessions">Terug naar agenda</Link>
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-[1.4fr_1fr_160px_160px] border-b bg-muted/20 px-4 py-3 text-sm font-medium">
            <span>Sessie</span>
            <span>Groep / klant</span>
            <span>Transcript</span>
            <span>Acties</span>
          </div>
          {recordings.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground">Nog geen opnames beschikbaar.</div>
          ) : (
            recordings.map((recording) => {
              const title =
                recording.title ||
                recording.session?.title ||
                recording.course?.title ||
                "Coaching sessie";
              const context =
                recording.course?.title ||
                (recording.session
                  ? `${recording.session.client.firstName} ${recording.session.client.lastName}`
                  : "Losse vergadering");
              return (
                <div
                  key={recording.id}
                  className="grid grid-cols-[1.4fr_1fr_160px_160px] items-start gap-3 border-b px-4 py-4 text-sm last:border-b-0"
                >
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      <Video className="h-4 w-4 text-[#5b5fc7]" />
                      {title}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {recording.scheduledAt
                        ? recording.scheduledAt.toLocaleString("nl-NL")
                        : recording.createdAt.toLocaleString("nl-NL")}
                    </p>
                    {recording.summary ? (
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                        {recording.summary}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-muted-foreground">{context}</div>
                  <div>
                    {recording.transcript || recording.transcriptSourceUrl ? (
                      <details className="max-w-md">
                        <summary className="cursor-pointer text-[#4f52b2]">Bekijk</summary>
                        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded border bg-muted/20 p-3 text-xs">
                          {recording.transcript || "Transcript beschikbaar via bronbestand."}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-muted-foreground">Nog niet beschikbaar</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/api/recordings/${recording.id}/playback?download=1`}>
                        <Download className="mr-2 h-4 w-4" />
                        Download opname
                      </Link>
                    </Button>
                    {recording.transcript ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/api/admin/sessions/recordings/${recording.id}/transcript`}>
                          <FileText className="mr-2 h-4 w-4" />
                          Download transcript
                        </Link>
                      </Button>
                    ) : null}
                    {recording.googleDriveWebViewLink ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={recording.googleDriveWebViewLink} target="_blank">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open in Drive
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
