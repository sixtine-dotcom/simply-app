"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Instagram, Loader2, RefreshCw, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type PublishState = {
  id: string;
  status: string;
  finalUrl: string | null;
  caption: string | null;
  captionRequestedAt: string | null;
  captionGeneratedAt: string | null;
  scheduledAt: string | null;
  publishStatus: string | null;
  publishError: string | null;
  publishedAt: string | null;
  publishHistory?: Array<{ publishedAt: string | null; caption: string | null; removed?: boolean }> | null;
  thumbnailSec?: number | null;
};

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultMoment() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  return toLocalInput(d);
}

const formatter = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/** Instagram: AI caption (editable) + schedule or publish now, for an approved reel. */
export function PublishPanel({
  project,
  onChanged,
  currentTime = 0,
  onSeek,
}: {
  project: PublishState;
  onChanged: () => Promise<void> | void;
  /** Position of the video player above (seconds), to pick the cover image. */
  currentTime?: number;
  onSeek?: (seconds: number) => void;
}) {
  const [caption, setCaption] = useState(project.caption ?? "");
  const [moment, setMoment] = useState(project.scheduledAt ? toLocalInput(new Date(project.scheduledAt)) : defaultMoment());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Take over a freshly generated caption unless the user is editing.
  useEffect(() => {
    if (!dirty) setCaption(project.caption ?? "");
  }, [project.caption, dirty]);

  // Once per visit: ask Instagram which earlier posts were deleted from the profile.
  const hasPosts = project.publishStatus === "PUBLISHED" || (project.publishHistory?.length ?? 0) > 0;
  useEffect(() => {
    if (!hasPosts) return;
    fetch(`/api/admin/video/${project.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check-posts" }),
    })
      .then((res) => (res.ok ? onChanged() : undefined))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, hasPosts]);

  async function send(action: string, extra: object = {}) {
    setBusy(action);
    setError(null);
    const res = await fetch(`/api/admin/video/${project.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(data.error || "Er ging iets mis");
      return false;
    }
    setDirty(false);
    await onChanged();
    return true;
  }

  const writing = project.captionRequestedAt !== null || (project.caption === null && project.status === "APPROVED");
  const locked = project.publishStatus === "PUBLISHING";
  const published = project.publishStatus === "PUBLISHED";
  // Every post ever made, also the ones deleted from Instagram (shown struck through, they don't count).
  const earlierPosts = [
    ...(project.publishHistory ?? []).map((p, i) => ({ ...p, index: i as number | "current" })),
    ...(published && project.publishedAt ? [{ publishedAt: project.publishedAt, caption: project.caption, removed: false, index: "current" as const }] : []),
  ].filter((p) => p.publishedAt);
  const livePosts = earlierPosts.filter((p) => !p.removed);

  return (
    <section className="space-y-3 rounded-3xl border border-white/70 bg-white/85 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Instagram className="h-5 w-5" />
        <h2 className="font-semibold text-slate-950">Publiceren op Instagram</h2>
        <span className="ml-auto text-sm">
          {project.publishStatus === "SCHEDULED" && project.scheduledAt ? (
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-800">Ingepland: {formatter.format(new Date(project.scheduledAt))}</span>
          ) : project.publishStatus === "PUBLISHING" ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">Wordt gepubliceerd…</span>
          ) : project.publishStatus === "PUBLISHED" && project.publishedAt ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">Gepubliceerd op {formatter.format(new Date(project.publishedAt))}</span>
          ) : project.publishStatus === "FAILED" ? (
            <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">Publiceren mislukt</span>
          ) : project.finalUrl ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">Klaar om te publiceren</span>
          ) : (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">Eindversie wordt gemaakt…</span>
          )}
        </span>
      </div>

      {/* Instagram cover image: a moment of the final video. */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
        {project.finalUrl && project.thumbnailSec != null ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            key={project.thumbnailSec}
            src={`${project.finalUrl}#t=${project.thumbnailSec}`}
            preload="metadata"
            muted
            playsInline
            className="h-24 w-[54px] shrink-0 rounded-md bg-slate-200 object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-medium">Omslagbeeld op Instagram</p>
          <p className="text-muted-foreground">
            {project.thumbnailSec != null ? `Beeld op ${mmss(project.thumbnailSec)}` : "Nog niet gekozen (Instagram kiest zelf)"}. Zet de video hierboven op het
            gewenste beeld en klik op de knop.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy !== null || project.publishStatus === "PUBLISHING"}
          onClick={() => void send("set-thumbnail", { seconds: Math.round(currentTime * 100) / 100 })}
        >
          Gebruik beeld op {mmss(currentTime)}
        </Button>
        {project.thumbnailSec != null ? (
          <>
            {onSeek ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => onSeek(project.thumbnailSec!)}>
                Bekijk
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="ghost" disabled={busy !== null} onClick={() => void send("set-thumbnail", { seconds: null })}>
              Wissen
            </Button>
          </>
        ) : null}
      </div>

      {project.publishError ? <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{project.publishError}</p> : null}

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <label htmlFor="ig-caption" className="text-sm font-medium">
            Caption
          </label>
          {writing ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Claude schrijft een caption in jouw tone of voice…
            </span>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto"
            disabled={writing || locked || busy !== null}
            onClick={() => void send("regenerate-caption")}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Genereer opnieuw
          </Button>
        </div>
        <Textarea
          id="ig-caption"
          rows={9}
          value={caption}
          disabled={locked}
          onChange={(event) => {
            setCaption(event.target.value);
            setDirty(true);
          }}
          placeholder={writing ? "" : "Caption"}
        />
        <p className="text-right text-xs text-muted-foreground">{caption.length}/2200</p>
      </div>

      {livePosts.length > 0 ? (
        <div className="rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-900">
          <p className="font-medium">Eerder gepost</p>
          <ul className="mt-1 space-y-0.5">
            {livePosts.map((p) => (
              <li key={String(p.index)} className="flex items-center gap-2">
                <span>✓ {formatter.format(new Date(p.publishedAt!))}</span>
                <button
                  type="button"
                  className="ml-auto underline-offset-2 hover:underline"
                  disabled={busy !== null}
                  onClick={() => void send("mark-removed", { index: p.index, removed: true })}
                >
                  niet meer online? wissen
                </button>
              </li>
            ))}
          </ul>
          {published ? <p className="mt-2">Wil je deze reel nog eens delen? Kies hieronder een nieuw moment: dezelfde video, met deze caption.</p> : null}
        </div>
      ) : null}

      {!locked ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-sm">
            <span className="block font-medium">Datum en tijd</span>
            <input
              type="datetime-local"
              value={moment}
              onChange={(event) => setMoment(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3"
            />
          </label>
          <Button
            type="button"
            disabled={!project.finalUrl || !caption.trim() || busy !== null}
            onClick={() => void send("schedule", { caption, scheduledAt: new Date(moment).toISOString() })}
          >
            {busy === "schedule" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}
            {project.publishStatus === "SCHEDULED" ? "Planning bijwerken" : published ? "Opnieuw inplannen" : "Inplannen"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!project.finalUrl || !caption.trim() || busy !== null}
            onClick={() => void send("publish-now", { caption })}
          >
            <Send className="mr-2 h-4 w-4" /> {published ? "Nu opnieuw posten" : "Nu publiceren"}
          </Button>
          {project.publishStatus === "SCHEDULED" || project.publishStatus === "FAILED" ? (
            <Button type="button" variant="ghost" disabled={busy !== null} onClick={() => void send("cancel")}>
              <X className="mr-1.5 h-4 w-4" /> Planning annuleren
            </Button>
          ) : null}
          {dirty ? (
            <Button type="button" variant="ghost" disabled={busy !== null} onClick={() => void send("save-caption", { caption })}>
              Caption opslaan
            </Button>
          ) : null}
        </div>
      ) : null}
      {!project.finalUrl && !locked ? (
        <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-900">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Inplannen kan zodra je Mac de eindversie heeft gemaakt en online gezet (meestal 5 à 10 minuten na goedkeuren). Deze
          pagina ververst vanzelf.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Op het gekozen moment zet je Mac de reel automatisch op Instagram. Je Mac moet dan aan staan en het programma moet
        draaien.
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
