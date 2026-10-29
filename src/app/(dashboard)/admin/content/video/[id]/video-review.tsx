"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, MessageSquare, Pencil, Plus, Scissors, Send, Sparkles, Trash2, X } from "lucide-react";
import { Player, PlayerRef } from "@remotion/player";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SimplyVideo, StyleAudio, StyleEmphasis, StyleOverlay, StyleZoom } from "@/components/video-studio/SimplyVideo";
import {
  VIDEO_COMMENT_KIND_LABELS,
  VIDEO_MODE_LABELS,
  VideoMarker,
  VideoMode,
  VideoProjectStatus,
  VideoStep,
  TranscriptWord,
} from "@/lib/video-studio-shared";
import { StatusBadge, StepBar } from "../video-ui";
import { CutEditor } from "./cut-editor";
import { AnimationPicker, PickedAnimation } from "./animation-picker";
import { AudioTab, DEFAULT_AUDIO } from "./audio-tab";
import { PublishPanel } from "./publish-panel";
import { SettingsPanel } from "./settings-panel";

type CommentKind = keyof typeof VIDEO_COMMENT_KIND_LABELS;

type ReviewVersion = {
  id: string;
  number: number;
  proxyUrl: string | null;
  posterUrl: string | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  transcript: TranscriptWord[] | null;
  edl: {
    style?: { emphasis: StyleEmphasis[]; zooms: StyleZoom[]; overlays?: StyleOverlay[]; audio?: StyleAudio };
    foregroundUrl?: string | null;
    segments?: Array<{ start: number; end: number; outStart: number }>;
  } | null;
  changeSummary: string | null;
  createdAt: string;
};

type ReviewComment = {
  id: string;
  versionId: string | null;
  kind: CommentKind;
  status: "OPEN" | "QUEUED" | "APPLIED" | "DISMISSED";
  startSec: number;
  endSec: number | null;
  selectedText: string | null;
  body: string;
  markers: VideoMarker[] | null;
  authorName: string | null;
  resolution: string | null;
  createdAt: string;
};

export type ReviewProject = {
  id: string;
  slug: string;
  title: string;
  mode: VideoMode;
  briefing: string | null;
  cutByVisuals: boolean;
  colorMatch: number | null;
  status: VideoProjectStatus;
  steps: VideoStep[] | null;
  errorMessage: string | null;
  finalUrl: string | null;
  finalVersion: number | null;
  sourceProxyUrl: string | null;
  caption: string | null;
  captionRequestedAt: string | null;
  captionGeneratedAt: string | null;
  scheduledAt: string | null;
  publishStatus: string | null;
  publishError: string | null;
  publishedAt: string | null;
  thumbnailSec?: number | null;
  versions: ReviewVersion[];
  comments: ReviewComment[];
};

type Draft = {
  kind: "COMMENT" | "REMOVE";
  body: string;
  startSec: number;
  markers: VideoMarker[];
};

type Line = { start: number; from: number; to: number };

const BUSY_STATUSES: VideoProjectStatus[] = ["WAITING_FOR_FOOTAGE", "PROCESSING", "APPLYING_FEEDBACK"];
const KIND_ICONS: Record<CommentKind, typeof MessageSquare> = {
  COMMENT: MessageSquare,
  REMOVE: Scissors,
  CAPTION_FIX: Pencil,
};
const COMMENT_STATUS_LABELS: Record<ReviewComment["status"], string> = {
  OPEN: "Open",
  QUEUED: "Wordt verwerkt",
  APPLIED: "Verwerkt",
  DISMISSED: "Genegeerd",
};
// Leave the player controls at the bottom clickable.
const CONTROLS_HEIGHT_PX = 56;
const FPS = 30;
const PLAYBACK_RATES = [1, 1.2, 1.4, 1.7, 2];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

function versionLabel(n: number) {
  return `v${String(n).padStart(3, "0")}`;
}

/** Transcript lines: break after sentence punctuation, long pauses or ~16 words. */
function groupLines(words: TranscriptWord[]): Line[] {
  const lines: Line[] = [];
  let from = 0;
  words.forEach((word, index) => {
    if (index === 0) return;
    const previous = words[index - 1];
    if (word.start - previous.end > 1 || index - from >= 16 || /[.?!]$/.test(previous.text)) {
      lines.push({ start: words[from].start, from, to: index - 1 });
      from = index;
    }
  });
  if (words.length) lines.push({ start: words[from].start, from, to: words.length - 1 });
  return lines;
}

export function VideoReview({
  initialProject,
  accentColor,
  primaryColor,
  usedIn = [],
}: {
  initialProject: ReviewProject;
  accentColor: string;
  primaryColor: string;
  usedIn?: string[];
}) {
  const [project, setProject] = useState(initialProject);
  const [versionId, setVersionId] = useState<string | null>(initialProject.versions[0]?.id ?? null);
  const [tab, setTab] = useState<"transcript" | "comments" | "animations" | "audio">("transcript");
  const [currentTime, setCurrentTime] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingLine, setEditingLine] = useState<{ from: number; to: number; text: string } | null>(null);
  const [focusedCommentId, setFocusedCommentId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  // Course videos open in the cut editor; social videos in the styled review.
  const [view, setView] = useState<"review" | "cut">(initialProject.mode === "COURSE" ? "cut" : "review");
  const playerRef = useRef<PlayerRef>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // Animations of the shown version, edited locally and saved shortly after each change.
  const [overlays, setOverlays] = useState<StyleOverlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<"new" | string | null>(null);
  const [overlaySaveState, setOverlaySaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const overlayDrag = useRef<{ id: string; moved: boolean } | null>(null);
  // Music, sound effects and voice level of the shown version.
  const [audio, setAudio] = useState<StyleAudio>(DEFAULT_AUDIO);
  const [audioSaveState, setAudioSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const audioTimer = useRef<ReturnType<typeof setTimeout>>();

  const version = project.versions.find((v) => v.id === versionId) ?? project.versions[0] ?? null;
  const latestVersion = project.versions[0] ?? null;
  const words = useMemo(() => version?.transcript ?? [], [version]);
  const lines = useMemo(() => groupLines(words), [words]);
  const openCount = project.comments.filter((c) => c.status === "OPEN").length;
  const isBusy = BUSY_STATUSES.includes(project.status);

  // Jump to a newly arrived version when the pipeline finishes.
  const latestVersionId = project.versions[0]?.id ?? null;
  const previousLatest = useRef(latestVersionId);
  useEffect(() => {
    if (latestVersionId && latestVersionId !== previousLatest.current) {
      setVersionId(latestVersionId);
      previousLatest.current = latestVersionId;
    }
  }, [latestVersionId]);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/admin/video/${project.id}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setProject(data.project);
    }
  }, [project.id]);

  useEffect(() => {
    // Don't swap data underneath the user while they are typing.
    if (editingLine || draft) return;
    const timer = setInterval(reload, isBusy ? 4000 : 20000);
    return () => clearInterval(timer);
  }, [reload, isBusy, editingLine, draft]);

  const activeWordIndex = useMemo(
    () => words.findIndex((w) => currentTime >= w.start && currentTime <= w.end + 0.05),
    [words, currentTime]
  );
  const isCourse = project.mode === "COURSE";
  // Course and "kant-en-klaar" videos are shown as they are: no captions, big words or animations on top.
  const subtitlesOnly = project.mode === "SUBTITLES";
  useEffect(() => { if (subtitlesOnly) setView("review"); }, [subtitlesOnly]);
  const plain = project.mode !== "SOCIAL" && !subtitlesOnly;
  const style = plain ? undefined : version?.edl?.style;

  // Reset the local animations only when another version is shown (not on every background refresh).
  const overlaysKey = version?.id ?? "";
  useEffect(() => {
    setOverlays((version?.edl?.style?.overlays as StyleOverlay[] | undefined) ?? []);
    setAudio({ ...DEFAULT_AUDIO, ...(version?.edl?.style?.audio ?? {}) });
    setSelectedOverlayId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlaysKey]);

  function saveOverlays(next: StyleOverlay[]) {
    if (!version) return;
    clearTimeout(saveTimer.current);
    setOverlaySaveState("saving");
    saveTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/video/${project.id}/versions/${version.id}/overlays`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overlays: next }),
      });
      setOverlaySaveState(res.ok ? "saved" : "error");
    }, 600);
  }

  function changeAudio(next: StyleAudio) {
    setAudio(next);
    if (!version) return;
    clearTimeout(audioTimer.current);
    setAudioSaveState("saving");
    audioTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/video/${project.id}/versions/${version.id}/audio`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: { music: next.music ?? null, voiceVolume: next.voiceVolume ?? 1, sfx: next.sfx ?? [] } }),
      });
      setAudioSaveState(res.ok ? "saved" : "error");
    }, 600);
  }

  function changeOverlays(next: StyleOverlay[]) {
    setOverlays(next);
    saveOverlays(next);
  }

  function updateOverlay(id: string, patch: Partial<StyleOverlay>) {
    changeOverlays(overlays.map((o) => (o.id === id ? { ...o, ...patch, manual: true } : o)));
  }

  function applyPicked(picked: PickedAnimation) {
    if (pickerTarget === "new") {
      const id = `manual-${Date.now().toString(36)}`;
      const start = Math.round(currentTime * 10) / 10;
      changeOverlays([
        ...overlays,
        picked.kind === "photos"
          ? { id, ...picked, preview: picked.preview ?? undefined, start, end: start + 3, x: 0.5, y: 0.5, size: 1, manual: true }
          : picked.fit
          ? { id, ...picked, preview: picked.preview ?? undefined, start, end: start + (picked.fit === "frame" ? 2.5 : 4), x: 0.74, y: 0.3, size: 0.42, manual: true }
          : picked.kind === "motion"
          ? { id, ...picked, preview: undefined, start, end: start + 5, x: 0.5, y: 0.17, size: 0.9, behind: true, manual: true }
          : { id, ...picked, preview: picked.preview ?? undefined, start, end: start + 3, x: 0.5, y: 0.16, size: 0.3, manual: true },
      ]);
      setSelectedOverlayId(id);
    } else if (pickerTarget) {
      updateOverlay(pickerTarget, { kind: picked.kind, src: picked.src, srcs: picked.srcs, layout: picked.layout, label: picked.label, preview: picked.preview ?? undefined, fit: picked.fit, data: undefined });
    }
  }

  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId) ?? null;
  const frameRatio = version?.width && version?.height ? version.width / version.height : 9 / 16;
  const inputProps = useMemo(
    () => ({
      videoSrc: version?.proxyUrl ?? "",
      displayFontSrc: "/fonts/video-studio/Edges.ttf",
      foregroundSrc: plain || subtitlesOnly ? null : version?.edl?.foregroundUrl ?? null,
      showCaptions: !plain,
      words: words.map(({ text, start, end }) => ({ text, start, end })),
      emphasis: subtitlesOnly ? [] : style?.emphasis ?? [],
      zooms: subtitlesOnly ? [] : style?.zooms ?? [],
      overlays: plain || subtitlesOnly ? [] : overlays,
      audio: plain || subtitlesOnly ? undefined : audio,
    }),
    [version?.proxyUrl, version?.edl?.foregroundUrl, words, style, plain, subtitlesOnly, overlays, audio]
  );

  // Follow the playhead for the transcript highlight and comment timestamps.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame = (event: { detail: { frame: number } }) => setCurrentTime(event.detail.frame / FPS);
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("seeked", onFrame);
    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("seeked", onFrame);
    };
  }, [version?.id]);

  function seek(seconds: number) {
    playerRef.current?.seekTo(Math.round(seconds * FPS));
    setCurrentTime(seconds);
  }

  function pause() {
    playerRef.current?.pause();
  }

  // Clicking the video pauses it and starts a comment pinned to that spot and moment.
  function onVideoClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const marker = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
    pause();
    const now = (playerRef.current?.getCurrentFrame() ?? Math.round(currentTime * FPS)) / FPS;
    setFocusedCommentId(null);
    setTab("comments");
    setDraft((current) =>
      current
        ? { ...current, markers: [...current.markers, { label: String.fromCharCode(65 + current.markers.length), ...marker }] }
        : { kind: "COMMENT", body: "", startSec: now, markers: [{ label: "A", ...marker }] }
    );
  }

  async function call(action: string, url: string, init: RequestInit) {
    setBusyAction(action);
    setError(null);
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
    const data = await res.json().catch(() => ({}));
    setBusyAction(null);
    if (!res.ok) {
      setError(data.error || "Er ging iets mis");
      return null;
    }
    return data;
  }

  async function saveDraft() {
    if (!draft) return;
    const data = await call("save", `/api/admin/video/${project.id}/comments`, {
      method: "POST",
      body: JSON.stringify({
        kind: draft.kind,
        body: draft.body.trim() || (draft.kind === "REMOVE" ? "Dit stuk weghalen." : ""),
        startSec: draft.startSec,
        markers: draft.markers,
        versionId: version?.id ?? null,
      }),
    });
    if (data) {
      setDraft(null);
      await reload();
    }
  }

  async function saveLineEdit() {
    if (!editingLine || !version) return;
    const original = words
      .slice(editingLine.from, editingLine.to + 1)
      .map((w) => w.text)
      .join(" ");
    const text = editingLine.text.trim();
    if (!text || text === original) {
      setEditingLine(null);
      return;
    }
    const data = await call("edit", `/api/admin/video/${project.id}/transcript`, {
      method: "POST",
      body: JSON.stringify({ versionId: version.id, from: editingLine.from, to: editingLine.to, text }),
    });
    if (data) {
      setProject((p) => ({
        ...p,
        versions: p.versions.map((v) => (v.id === data.version.id ? { ...v, transcript: data.version.transcript } : v)),
      }));
      setEditingLine(null);
    }
  }

  const shownMarkers = draft?.markers ?? project.comments.find((c) => c.id === focusedCommentId)?.markers ?? [];
  const aspect = version?.width && version?.height ? `${version.width} / ${version.height}` : isCourse ? "16 / 9" : "9 / 16";
  const landscape = version?.width && version?.height ? version.width > version.height : isCourse;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Link href="/admin/content/video" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Alle video&apos;s
            </Link>
            <p className="app-kicker mt-3">Video Studio · {VIDEO_MODE_LABELS[project.mode] ?? "Social"}</p>
            {titleDraft !== null ? (
              <form
                className="mt-1 flex items-center gap-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const title = titleDraft.trim();
                  if (title.length < 2 || title === project.title) return setTitleDraft(null);
                  const ok = await call("rename", `/api/admin/video/${project.id}`, { method: "PATCH", body: JSON.stringify({ action: "rename", title }) });
                  if (ok) {
                    setProject((p) => ({ ...p, title }));
                    setTitleDraft(null);
                  }
                }}
              >
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onKeyDown={(event) => event.key === "Escape" && setTitleDraft(null)}
                  aria-label="Titel van de video"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1 text-2xl font-semibold tracking-tight text-slate-950"
                />
                <Button type="submit" size="sm" disabled={busyAction !== null}>
                  <Check className="mr-1 h-4 w-4" /> Opslaan
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setTitleDraft(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <div className="group mt-1 flex min-w-0 items-center gap-2">
                <h1 className="truncate text-3xl font-semibold tracking-tight text-slate-950">{project.title}</h1>
                <button
                  type="button"
                  onClick={() => setTitleDraft(project.title)}
                  className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Titel aanpassen"
                  title="Titel aanpassen"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {/* Type of video: changeable until it is approved; with a version, the video is edited again. */}
              <div className="flex rounded-full border border-slate-200 bg-white p-1" role="radiogroup" aria-label="Soort video">
                {(Object.keys(VIDEO_MODE_LABELS) as VideoMode[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={project.mode === key}
                    disabled={project.status === "APPROVED" || isBusy || busyAction !== null}
                    title={project.status === "APPROVED" ? "Heropen de video om de soort te wijzigen" : undefined}
                    onClick={async () => {
                      if (key === project.mode) return;
                      const hasVersion = project.versions.length > 0;
                      if (hasVersion && !window.confirm(`Omzetten naar "${VIDEO_MODE_LABELS[key]}"? De video wordt opnieuw bewerkt.`)) return;
                      const ok = await call("mode", `/api/admin/video/${project.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ action: "settings", mode: key, redo: hasVersion ? "recut" : undefined }),
                      });
                      if (ok) await reload();
                    }}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs disabled:cursor-not-allowed",
                      project.mode === key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 disabled:hover:bg-transparent"
                    )}
                  >
                    {VIDEO_MODE_LABELS[key]}
                  </button>
                ))}
              </div>
              <p className="font-mono text-xs text-muted-foreground">Map op je Mac: {project.mode === "COURSE" ? "Lesmateriaal" : "Content"}/{project.slug}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-slate-200 bg-white p-1" role="radiogroup" aria-label="Scherm">
              {(
                [
                  ["review", "Review"],
                  ["cut", "Knip-editor"],
                ] as const
              ).filter(([key]) => !subtitlesOnly || key !== "cut").map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={view === key}
                  onClick={() => setView(key)}
                  className={cn("rounded-full px-3 py-1 text-xs", view === key ? "bg-slate-900 text-white" : "text-slate-600")}
                >
                  {label}
                </button>
              ))}
            </div>
            <StatusBadge status={project.status} />
            {project.versions.length > 0 ? (
              <select
                value={version?.id ?? ""}
                onChange={(event) => setVersionId(event.target.value)}
                className="h-9 rounded-full border border-slate-200 bg-white px-3 font-mono text-sm"
                aria-label="Versie"
              >
                {project.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {versionLabel(v.number)}
                  </option>
                ))}
              </select>
            ) : null}
            {!subtitlesOnly ? <Button
              size="sm"
              disabled={openCount === 0 || isBusy || busyAction !== null}
              onClick={async () => {
                if (await call("feedback", `/api/admin/video/${project.id}/feedback`, { method: "POST" })) await reload();
              }}
            >
              <Send className="mr-1.5 h-4 w-4" />
              Verwerk feedback{openCount > 0 ? ` (${openCount})` : ""}
            </Button> : null}
            {project.status === "FAILED" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busyAction !== null}
                onClick={async () => {
                  if (await call("retry", `/api/admin/video/${project.id}`, { method: "PATCH", body: JSON.stringify({ action: "retry" }) })) await reload();
                }}
              >
                Opnieuw proberen
              </Button>
            ) : null}
            {project.status === "APPROVED" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (await call("reopen", `/api/admin/video/${project.id}`, { method: "PATCH", body: JSON.stringify({ action: "reopen" }) })) await reload();
                }}
              >
                Heropenen
              </Button>
            ) : (
              <Button
                title="Je hebt alles nagekeken: de eindversie wordt gemaakt en daarna kun je inplannen of in een cursus gebruiken"
                size="sm"
                variant="outline"
                disabled={!version || isBusy || busyAction !== null}
                onClick={async () => {
                  if (await call("approve", `/api/admin/video/${project.id}`, { method: "PATCH", body: JSON.stringify({ action: "approve" }) })) await reload();
                }}
              >
                <Check className="mr-1.5 h-4 w-4" /> Nagekeken &amp; klaar
              </Button>
            )}
          </div>
        </header>

        <AnimationPicker
          open={pickerTarget !== null}
          onOpenChange={(open) => !open && setPickerTarget(null)}
          onPick={applyPicked}
          orientation={frameRatio > 1 ? "landscape" : "portrait"}
        />
        <StepBar steps={project.steps ?? []} />
        {project.status !== "APPROVED" ? (
          <SettingsPanel project={project} busy={isBusy} onChanged={reload} />
        ) : null}
        {project.status === "APPROVED" && project.mode !== "COURSE" ? (
          <PublishPanel project={project} onChanged={reload} currentTime={currentTime} onSeek={seek} />
        ) : project.status === "APPROVED" ? (
          project.finalUrl ? (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <Check className="h-4 w-4" />
              <span>
                {usedIn.length > 0 ? (
                  <>
                    In cursus: <strong>{usedIn.join(" · ")}</strong>
                  </>
                ) : (
                  <>
                    Eindversie {project.finalVersion ? versionLabel(project.finalVersion) : ""} staat online. Kies hem bij een les via
                    <strong> Kies uit Video Studio</strong>.
                  </>
                )}
              </span>
              <span className="ml-auto flex gap-2">
                <a href={project.finalUrl} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                  Openen
                </a>
                <button
                  type="button"
                  className="underline-offset-4 hover:underline"
                  onClick={() => void navigator.clipboard?.writeText(project.finalUrl ?? "")}
                >
                  Link kopiëren
                </button>
              </span>
            </div>
          ) : (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Goedgekeurd. Je Mac maakt nu de eindversie en zet hem online. Dit kan bij lange video&apos;s even duren.
            </p>
          )
        ) : null}
        {project.errorMessage ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{project.errorMessage}</p>
        ) : null}
        {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        {view === "cut" ? (
          latestVersion ? (
            <CutEditor
              projectId={project.id}
              basedOnVersion={latestVersion.number}
              versionSegments={latestVersion.edl?.segments ?? []}
              busy={isBusy}
              onSaved={() => void reload()}
            />
          ) : (
            <p className="text-sm text-muted-foreground">De knip-editor is beschikbaar zodra de eerste versie klaar is.</p>
          )
        ) : (
        <div className={cn("grid gap-5", !landscape && "lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]")}>
          {/* Player */}
          <div className="space-y-3">
            <div
              className={cn("relative mx-auto w-full overflow-hidden rounded-3xl bg-slate-950", landscape ? "max-w-5xl" : "max-w-[420px]")}
              style={{ aspectRatio: aspect }}
              ref={stageRef}
            >
              {version?.proxyUrl ? (
                <>
                  <Player
                    ref={playerRef}
                    key={version.id}
                    component={SimplyVideo}
                    inputProps={inputProps}
                    durationInFrames={Math.max(1, Math.round((version.durationSec ?? 1) * FPS))}
                    compositionWidth={version.width ?? 720}
                    compositionHeight={version.height ?? 1280}
                    fps={FPS}
                    playbackRate={playbackRate}
                    controls
                    clickToPlay={false}
                    acknowledgeRemotionLicense
                    style={{ width: "100%", height: "100%" }}
                  />
                  <div
                    className="absolute inset-x-0 top-0 cursor-crosshair"
                    style={{ bottom: CONTROLS_HEIGHT_PX }}
                    onClick={onVideoClick}
                    title="Klik om een opmerking op dit moment en deze plek te geven"
                  />
                  {!plain && !subtitlesOnly
                    ? overlays
                        .filter((o) => currentTime >= o.start && currentTime <= o.end)
                        .map((o) => {
                          if (o.fit === "frame") return null; // full-frame B-roll: edit it from the Animaties tab
                          const h = o.size * frameRatio * (o.fit === "window" ? 1.25 : o.kind === "motion" ? (o.data && (o.data as { type?: string }).type !== "line" ? 0.72 : 0.62) : 1);
                          return (
                            <div
                              key={o.id}
                              role="button"
                              tabIndex={0}
                              aria-label={`Animatie ${o.label}`}
                              title="Klik om te bewerken, sleep om te verplaatsen"
                              onMouseDown={(event) => {
                                event.stopPropagation();
                                pause();
                                setSelectedOverlayId(o.id);
                                setTab("animations");
                                overlayDrag.current = { id: o.id, moved: false };
                                const rect = stageRef.current?.getBoundingClientRect();
                                if (!rect) return;
                                const onMove = (e: MouseEvent) => {
                                  if (!overlayDrag.current) return;
                                  overlayDrag.current.moved = true;
                                  const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                                  const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
                                  setOverlays((list) => list.map((item) => (item.id === o.id ? { ...item, x, y, manual: true } : item)));
                                };
                                const onUp = () => {
                                  window.removeEventListener("mousemove", onMove);
                                  window.removeEventListener("mouseup", onUp);
                                  if (overlayDrag.current?.moved) setOverlays((list) => (saveOverlays(list), list));
                                  overlayDrag.current = null;
                                };
                                window.addEventListener("mousemove", onMove);
                                window.addEventListener("mouseup", onUp);
                              }}
                              onClick={(event) => event.stopPropagation()}
                              className={cn(
                                "absolute cursor-move rounded-xl border-2",
                                selectedOverlayId === o.id ? "border-white shadow-[0_0_0_2px_rgba(15,23,42,0.6)]" : "border-dashed border-white/70"
                              )}
                              style={{
                                left: `${(o.x - o.size / 2) * 100}%`,
                                width: `${o.size * 100}%`,
                                top: `${(o.y - h / 2) * 100}%`,
                                height: `${h * 100}%`,
                              }}
                            />
                          );
                        })
                    : null}
                  {shownMarkers.map((marker) => (
                    <span
                      key={marker.label}
                      className="pointer-events-none absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow"
                      style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%`, background: accentColor }}
                    >
                      {marker.label}
                    </span>
                  ))}
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-white">
                  <p className="text-lg font-semibold">Nog geen preview</p>
                  <p className="text-sm text-white/70">
                    {project.status === "WAITING_FOR_FOOTAGE"
                      ? `Sleep je beeldmateriaal op je Mac in ${project.mode === "COURSE" ? "Lesmateriaal" : "Content"}/${project.slug}/01_raw`
                      : "De video wordt op je Mac bewerkt. Deze pagina ververst vanzelf."}
                  </p>
                </div>
              )}
            </div>
            {version ? (
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>
                  {versionLabel(version.number)} · {formatTime(currentTime)}
                  {version.durationSec ? ` / ${formatTime(version.durationSec)}` : ""}
                </span>
                <span>Klik op de video voor een opmerking</span>
              </div>
            ) : null}
            {version?.proxyUrl ? (
              <div className="flex items-center justify-center gap-1" role="radiogroup" aria-label="Afspeelsnelheid">
                <span className="mr-1 text-xs text-muted-foreground">Snelheid</span>
                {PLAYBACK_RATES.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    role="radio"
                    aria-checked={playbackRate === rate}
                    onClick={() => setPlaybackRate(rate)}
                    className={cn(
                      "rounded-full px-2.5 py-1 font-mono text-xs",
                      playbackRate === rate ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {String(rate).replace(".", ",")}×
                  </button>
                ))}
              </div>
            ) : null}
            {version?.changeSummary ? (
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Wat is er aangepast</p>
                <p className="mt-1 whitespace-pre-line text-slate-700">{version.changeSummary}</p>
              </div>
            ) : null}
          </div>

          {/* Side panel */}
          <div className="flex min-h-[560px] flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/85">
            <div className="flex items-center gap-1 border-b border-slate-200 px-4">
              {(subtitlesOnly ? (["transcript"] as const) : plain ? (["transcript", "comments"] as const) : (["transcript", "comments", "animations", "audio"] as const)).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={cn(
                    "-mb-px border-b-2 px-3 py-3 text-sm font-medium",
                    tab === key ? "text-slate-950" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                  style={tab === key ? { borderColor: primaryColor } : undefined}
                >
                  {key === "transcript"
                    ? "Transcriptie"
                    : key === "comments"
                      ? `Opmerkingen (${project.comments.length})`
                      : key === "animations"
                        ? `Animaties (${overlays.length})`
                        : "Audio"}
                </button>
              ))}
            </div>

            {draft ? (
              <div className="space-y-3 border-b border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {(["COMMENT", "REMOVE"] as const).map((kind) => {
                    const Icon = KIND_ICONS[kind];
                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => setDraft({ ...draft, kind })}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                          draft.kind === kind ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" /> {VIDEO_COMMENT_KIND_LABELS[kind]}
                      </button>
                    );
                  })}
                  <span className="ml-auto font-mono text-xs text-muted-foreground">op {formatTime(draft.startSec)}</span>
                </div>
                <Textarea
                  autoFocus
                  value={draft.body}
                  onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void saveDraft();
                  }}
                  placeholder={draft.kind === "REMOVE" ? "Optioneel: waarom moet dit eruit?" : "Bijv. ‘animatie niet boven mijn hoofd’"}
                  rows={3}
                />
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {draft.markers.map((marker) => (
                    <span key={marker.label} className="rounded-full px-2 py-0.5 font-bold text-white" style={{ background: accentColor }}>
                      {marker.label}
                    </span>
                  ))}
                  <span>Klik nog eens op de video voor een extra marker.</span>
                  <div className="ml-auto flex gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
                      <X className="mr-1 h-4 w-4" /> Annuleren
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyAction !== null || (draft.body.trim().length === 0 && draft.kind !== "REMOVE")}
                      onClick={() => void saveDraft()}
                    >
                      Opslaan
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex-1 overflow-y-auto p-4">
              {tab === "audio" ? (
                <AudioTab audio={audio} currentTime={currentTime} saveState={audioSaveState} onChange={changeAudio} />
              ) : tab === "animations" ? (
                <AnimationsTab
                  overlays={overlays}
                  selected={selectedOverlay}
                  currentTime={currentTime}
                  saveState={overlaySaveState}
                  onSelect={(o) => {
                    setSelectedOverlayId(o.id);
                    pause();
                    seek(o.start + 0.2);
                  }}
                  onAdd={() => setPickerTarget("new")}
                  onReplace={(o) => setPickerTarget(o.id)}
                  onChange={updateOverlay}
                  onDelete={(o) => {
                    changeOverlays(overlays.filter((x) => x.id !== o.id));
                    setSelectedOverlayId(null);
                  }}
                />
              ) : tab === "transcript" ? (
                words.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {project.cutByVisuals && version
                      ? "Geknipt op beeld: er is geen transcriptie. Wil je iets anders? Zet een opmerking op de video of pas de briefing aan."
                      : "De transcriptie verschijnt hier zodra de eerste versie klaar is."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Klik op een zin om de tekst aan te passen. De ondertitels passen zich meteen aan. Klik op de tijd om erheen te springen.
                    </p>
                    {lines.map((line) => {
                      const isEditing = editingLine?.from === line.from;
                      const text = words
                        .slice(line.from, line.to + 1)
                        .map((w) => w.text)
                        .join(" ");
                      return (
                        <div key={line.from} className="grid grid-cols-[52px_1fr] gap-3">
                          <button
                            type="button"
                            onClick={() => seek(line.start)}
                            className="pt-2 text-left font-mono text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            {formatTime(line.start)}
                          </button>
                          {isEditing ? (
                            <Textarea
                              autoFocus
                              rows={2}
                              value={editingLine.text}
                              onChange={(event) => setEditingLine({ ...editingLine, text: event.target.value })}
                              onBlur={() => void saveLineEdit()}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                  event.preventDefault();
                                  void saveLineEdit();
                                }
                                if (event.key === "Escape") setEditingLine(null);
                              }}
                              className="text-[15px] leading-7"
                            />
                          ) : (
                            <p
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                seek(line.start);
                                setEditingLine({ from: line.from, to: line.to, text });
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") setEditingLine({ from: line.from, to: line.to, text });
                              }}
                              className="group cursor-text rounded-xl px-2 py-1 leading-7 text-slate-800 hover:bg-slate-50"
                            >
                              {words.slice(line.from, line.to + 1).map((word, offset) => {
                                const index = line.from + offset;
                                return (
                                  <span
                                    key={index}
                                    className="rounded px-0.5"
                                    style={index === activeWordIndex ? { background: accentColor, color: "white" } : undefined}
                                  >
                                    {word.text}{" "}
                                  </span>
                                );
                              })}
                              <Pencil className="ml-1 inline h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100" />
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : project.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nog geen opmerkingen. Speel de video af en klik op het beeld waar je iets anders wilt.
                </p>
              ) : (
                <ul className="space-y-3">
                  {project.comments.map((comment, index) => {
                    const Icon = KIND_ICONS[comment.kind] ?? MessageSquare;
                    const commentVersion = project.versions.find((v) => v.id === comment.versionId);
                    return (
                      <li
                        key={comment.id}
                        className={cn(
                          "rounded-2xl border bg-white p-3 text-sm transition",
                          focusedCommentId === comment.id ? "border-slate-900" : "border-slate-200",
                          (comment.status === "APPLIED" || comment.status === "DISMISSED") && "opacity-70"
                        )}
                      >
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => {
                            setDraft(null);
                            setFocusedCommentId(comment.id);
                            if (commentVersion && commentVersion.id !== version?.id) setVersionId(commentVersion.id);
                            pause();
                            seek(comment.startSec);
                          }}
                        >
                          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                            <span>#{index + 1}</span>
                            <span>{formatTime(comment.startSec)}</span>
                            <span className="flex items-center gap-1">
                              <Icon className="h-3 w-3" /> {VIDEO_COMMENT_KIND_LABELS[comment.kind]}
                            </span>
                            {commentVersion ? <span>{versionLabel(commentVersion.number)}</span> : null}
                            <span
                              className={cn(
                                "ml-auto rounded-full px-2 py-0.5 font-sans",
                                comment.status === "OPEN" && "bg-slate-100 text-slate-700",
                                comment.status === "QUEUED" && "bg-amber-100 text-amber-800",
                                comment.status === "APPLIED" && "bg-emerald-100 text-emerald-800",
                                comment.status === "DISMISSED" && "bg-slate-100 text-slate-500"
                              )}
                            >
                              {COMMENT_STATUS_LABELS[comment.status]}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-line text-slate-900">{comment.body}</p>
                          {comment.markers && comment.markers.length > 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Markers: {comment.markers.map((m) => m.label).join(", ")}
                            </p>
                          ) : null}
                          {comment.resolution ? (
                            <p className="mt-2 rounded-xl bg-emerald-50 p-2 text-xs text-emerald-900">
                              <strong>Pipeline:</strong> {comment.resolution}
                            </p>
                          ) : null}
                        </button>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>
                            {comment.authorName ?? "Onbekend"} · {new Date(comment.createdAt).toLocaleString("nl-NL")}
                          </span>
                          {comment.status === "OPEN" ? (
                            <button
                              type="button"
                              className="flex items-center gap-1 text-red-600 hover:underline"
                              onClick={async () => {
                                if (await call("delete", `/api/admin/video/comments/${comment.id}`, { method: "DELETE" })) await reload();
                              }}
                            >
                              <Trash2 className="h-3 w-3" /> Verwijderen
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function AnimationsTab({
  overlays,
  selected,
  currentTime,
  saveState,
  onSelect,
  onAdd,
  onReplace,
  onChange,
  onDelete,
}: {
  overlays: StyleOverlay[];
  selected: StyleOverlay | null;
  currentTime: number;
  saveState: "idle" | "saving" | "saved" | "error";
  onSelect: (o: StyleOverlay) => void;
  onAdd: () => void;
  onReplace: (o: StyleOverlay) => void;
  onChange: (id: string, patch: Partial<StyleOverlay>) => void;
  onDelete: (o: StyleOverlay) => void;
}) {
  const sorted = [...overlays].sort((a, b) => a.start - b.start);
  const PRESETS = [
    ["Boven", 0.5, 0.16],
    ["Links", 0.2, 0.4],
    ["Rechts", 0.8, 0.4],
    ["Onder", 0.5, 0.84],
  ] as const;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={onAdd}>
          <Plus className="mr-1.5 h-4 w-4" /> Animatie op {formatTime(currentTime)}
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {saveState === "saving" ? "Opslaan…" : saveState === "saved" ? "Opgeslagen ✓" : saveState === "error" ? "Opslaan mislukt" : ""}
        </span>
      </div>

      {selected ? (
        <div className="space-y-3 rounded-2xl border border-slate-900 bg-white p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
              {selected.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.preview} alt="" className="h-full w-full object-contain" />
              ) : (
                <Sparkles className="h-5 w-5 text-slate-400" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">{selected.label}</p>
              <p className="text-xs text-muted-foreground">Sleep het kader in de video om te verplaatsen.</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => onReplace(selected)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Wijzig
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map(([label, x, y]) => (
              <button key={label} type="button" onClick={() => onChange(selected.id, { x, y })} className="rounded-full border border-slate-200 px-3 py-1 text-xs hover:bg-slate-100">
                {label}
              </button>
            ))}
          </div>
          <label className="block text-xs">
            <span className="text-muted-foreground">Grootte</span>
            <input
              type="range"
              min={0.1}
              max={0.7}
              step={0.01}
              value={selected.size}
              onChange={(e) => onChange(selected.id, { size: Number(e.target.value) })}
              className="w-full"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="space-y-1">
              <span className="text-muted-foreground">Start (sec)</span>
              <div className="flex gap-1">
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  value={Math.round(selected.start * 10) / 10}
                  onChange={(e) => {
                    const start = Math.max(0, Number(e.target.value));
                    onChange(selected.id, { start, end: Math.max(selected.end, start + 0.5) });
                  }}
                  className="h-8 w-full rounded-lg border border-slate-200 px-2"
                />
                <button type="button" onClick={() => onChange(selected.id, { start: currentTime, end: Math.max(selected.end, currentTime + 0.5) })} className="rounded-lg border border-slate-200 px-2 hover:bg-slate-100" title="Start op de huidige tijd">
                  nu
                </button>
              </div>
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground">Duur (sec)</span>
              <input
                type="number"
                step={0.5}
                min={0.5}
                value={Math.round((selected.end - selected.start) * 10) / 10}
                onChange={(e) => onChange(selected.id, { end: selected.start + Math.max(0.5, Number(e.target.value)) })}
                className="h-8 w-full rounded-lg border border-slate-200 px-2"
              />
            </label>
          </div>
          <Button type="button" size="sm" variant="ghost" className="text-red-600" onClick={() => onDelete(selected)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Verwijderen
          </Button>
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nog geen animaties. Speel de video af en klik op “Animatie op …”.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {sorted.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => onSelect(o)}
                className={cn("flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50", selected?.id === o.id && "bg-slate-50")}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                  {o.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.preview} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-slate-400" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{o.label}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {formatTime(o.start)}–{formatTime(o.end)}
                </span>
                {o.manual ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">aangepast</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
