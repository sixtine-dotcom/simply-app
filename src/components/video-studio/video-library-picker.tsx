"use client";

import { useEffect, useState } from "react";
import { Clapperboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type LibraryVideo = {
  id: string;
  title: string;
  mode: "SOCIAL" | "COURSE";
  finalUrl: string;
  finalVersion: number | null;
  finalDurationSec: number | null;
  approvedAt: string | null;
  posterUrl: string | null;
};

function formatDuration(seconds: number | null) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "Kies uit Video Studio": pick a finished, approved export and hand back its URL. */
export function VideoLibraryPicker({ onSelect, disabled }: { onSelect: (video: LibraryVideo) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [videos, setVideos] = useState<LibraryVideo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setVideos(null);
    setError(null);
    fetch("/api/admin/video/library", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Laden mislukt"))))
      .then((data) => setVideos(data.videos))
      .catch(() => setError("Kon de video's niet laden."));
  }, [open]);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)} disabled={disabled}>
        <Clapperboard className="mr-2 h-4 w-4" />
        Kies uit Video Studio
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kies een video uit Video Studio</DialogTitle>
            <DialogDescription>Goedgekeurde video&apos;s waarvan de eindversie online staat.</DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!videos && !error ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Laden…
            </p>
          ) : null}
          {videos && videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nog geen video&apos;s klaar. Keur een video goed in Video Studio; zodra je Mac de eindversie heeft
              geüpload, verschijnt hij hier.
            </p>
          ) : null}
          {videos && videos.length > 0 ? (
            <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
              {videos.map((video) => (
                <li key={video.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-slate-50"
                    onClick={() => {
                      onSelect(video);
                      setOpen(false);
                    }}
                  >
                    <span className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-900">
                      {video.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={video.posterUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Clapperboard className="h-4 w-4 text-white/60" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{video.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {video.mode === "COURSE" ? "Cursus" : "Social"}
                        {video.finalVersion ? ` · v${String(video.finalVersion).padStart(3, "0")}` : ""}
                        {video.finalDurationSec ? ` · ${formatDuration(video.finalDurationSec)}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
