"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Video, PlayCircle, Loader2, Download } from "lucide-react";

interface Recording {
  id: string;
  title: string | null;
  summary: string | null;
  transcript: string | null;
  hasTranscript: boolean;
  scheduledAt: string | null;
  durationSecs: number | null;
  createdAt: string;
}

interface CourseRecordingsData {
  course: { id: string; title: string };
  recordings: Recording[];
  permissions: {
    canDownload: boolean;
    canViewTranscript: boolean;
  };
}

export default function CourseCoachingsPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;
  const [data, setData] = useState<CourseRecordingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/courses/${slug}/recordings`)
      .then((res) => res.json())
      .then((d) => {
        if (d.recordings !== undefined) setData(d);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  const handleWatch = async (recordingId: string) => {
    setPlayingId(recordingId);
    try {
      const res = await fetch(`/api/recordings/${recordingId}/playback?valid_for_secs=3600`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Kon opname niet laden");
      if (json.url) window.open(json.url, "_blank");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Kon opname niet openen");
    } finally {
      setPlayingId(null);
    }
  };

  const handleDownload = async (recordingId: string) => {
    setPlayingId(recordingId);
    try {
      const res = await fetch(`/api/recordings/${recordingId}/playback?valid_for_secs=3600&download=1`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Kon download niet laden");
      if (json.url) window.open(json.url, "_blank");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Kon opname niet downloaden");
    } finally {
      setPlayingId(null);
    }
  };

  if (!slug) return null;

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <Link
        href={`/courses/${slug}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar cursus
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl tracking-wider flex items-center gap-2">
          <Video className="h-6 w-6" />
          COACHINGS & OPNAMEN
        </h1>
        <p className="mt-2 text-muted-foreground">
          Groepscoaching-sessies worden automatisch opgenomen. Opnames en samenvattingen verschijnen hier na afloop.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Kon gegevens niet laden.
          </CardContent>
        </Card>
      ) : data.recordings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="font-display text-xl tracking-wider mb-2">
              NOG GEEN OPNAMEN
            </h2>
            <p className="text-muted-foreground">
              Groepscoaching-sessies verschijnen hier na afloop als opname.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {data.recordings.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {r.title || "Coaching opname"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {r.scheduledAt
                        ? new Date(r.scheduledAt).toLocaleString("nl-NL", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : new Date(r.createdAt).toLocaleDateString("nl-NL")}
                      {r.durationSecs != null &&
                        ` · ${Math.floor(r.durationSecs / 60)} min`}
                    </p>
                    {r.summary ? (
                      <div className="mt-3 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground whitespace-pre-line">
                        {r.summary}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button
                      variant="default"
                      onClick={() => handleWatch(r.id)}
                      disabled={playingId === r.id}
                    >
                      {playingId === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <PlayCircle className="h-4 w-4 mr-2" />
                      )}
                      Bekijk opname
                    </Button>
                    {data.permissions.canDownload ? (
                      <Button
                        variant="outline"
                        onClick={() => handleDownload(r.id)}
                        disabled={playingId === r.id}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    ) : null}
                  </div>
                </div>
                {data.permissions.canViewTranscript && r.transcript ? (
                  <details className="mt-4 rounded-lg border bg-background p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      Transcript bekijken
                    </summary>
                    <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                      {r.transcript}
                    </pre>
                  </details>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
