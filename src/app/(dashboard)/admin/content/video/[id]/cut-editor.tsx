"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pause, Play, RotateCcw, Scissors, Trash2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Loom-style cut editor on the FULL recording: kept parts are blue, cut parts grey and struck through.
// Saving sends the kept segments to the Mac, which renders them as the next version (no AI).

type Segment = { start: number; end: number };
type SourceWord = { text: string; start: number; end: number; isEvent: boolean };
type SourceData = {
  sourceProxyUrl: string | null;
  sourceDurationSec: number | null;
  sourceTranscript: Array<[string, number, number, number]> | null;
  sourceWaveform: { perSecond: number; peaks: number[] } | null;
};

const PLAYBACK_RATES = [1, 1.2, 1.4, 1.7, 2];
const MIN_SEGMENT = 0.1;
const TIMELINE_HEIGHT = 84;
const HANDLE_WIDTH = 8;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatPrecise(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

function normalize(segments: Segment[]) {
  const sorted = segments.filter((s) => s.end - s.start >= MIN_SEGMENT).sort((a, b) => a.start - b.start);
  const merged: Segment[] = [];
  for (const seg of sorted) {
    const prev = merged[merged.length - 1];
    if (prev && seg.start <= prev.end + 0.05) prev.end = Math.max(prev.end, seg.end);
    else merged.push({ ...seg });
  }
  return merged;
}

function subtract(segments: Segment[], a: number, b: number) {
  const out: Segment[] = [];
  for (const seg of segments) {
    if (seg.end <= a || seg.start >= b) out.push(seg);
    else {
      if (a - seg.start >= MIN_SEGMENT) out.push({ start: seg.start, end: a });
      if (seg.end - b >= MIN_SEGMENT) out.push({ start: b, end: seg.end });
    }
  }
  return normalize(out);
}

function union(segments: Segment[], a: number, b: number) {
  return normalize([...segments, { start: a, end: b }]);
}

function isKept(segments: Segment[], t: number) {
  return segments.some((s) => t >= s.start && t < s.end);
}

function sameSegments(a: Segment[], b: Segment[]) {
  return a.length === b.length && a.every((s, i) => Math.abs(s.start - b[i].start) < 0.01 && Math.abs(s.end - b[i].end) < 0.01);
}

/** Paragraphs for the transcript: break on long pauses or after a sentence once a line is long. */
function paragraphs(words: SourceWord[]) {
  const out: Array<{ start: number; from: number; to: number }> = [];
  let from = 0;
  words.forEach((w, i) => {
    if (i === 0) return;
    const prev = words[i - 1];
    if (w.start - prev.end > 1.5 || (i - from > 25 && /[.?!]$/.test(prev.text)) || i - from > 60) {
      out.push({ start: words[from].start, from, to: i - 1 });
      from = i;
    }
  });
  if (words.length) out.push({ start: words[from].start, from, to: words.length - 1 });
  return out;
}

export function CutEditor({
  projectId,
  basedOnVersion,
  versionSegments,
  busy,
  onSaved,
}: {
  projectId: string;
  basedOnVersion: number;
  versionSegments: Segment[];
  busy: boolean;
  onSaved: () => void;
}) {
  const [source, setSource] = useState<SourceData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Keyed on the content, not the array identity: the review page re-polls every few seconds and
  // must not wipe unsaved cuts; only a genuinely new version resets the editor.
  const segmentsKey = JSON.stringify(versionSegments.map(({ start, end }) => [start, end]));
  const initial = useMemo(
    () => normalize((JSON.parse(segmentsKey) as Array<[number, number]>).map(([start, end]) => ({ start, end }))),
    [segmentsKey]
  );
  const [segments, setSegments] = useState<Segment[]>(initial);
  const [history, setHistory] = useState<Segment[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [textRange, setTextRange] = useState<[number, number] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(800);
  const drag = useRef<{ index: number; edge: "start" | "end" } | null>(null);
  const textDrag = useRef<{ anchor: number; moved: boolean } | null>(null);

  // A new version from the Mac resets the editor to what that version contains.
  useEffect(() => {
    setSegments(initial);
    setHistory([]);
    setSelected(null);
  }, [initial]);

  useEffect(() => {
    fetch(`/api/admin/video/${projectId}/source`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then((data) => setSource(data.source))
      .catch(() => setLoadError("Kon de volledige opname niet laden."));
  }, [projectId]);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setTimelineWidth(el.clientWidth));
    observer.observe(el);
    setTimelineWidth(el.clientWidth);
    return () => observer.disconnect();
  }, [source]);

  const duration = source?.sourceDurationSec ?? 0;
  const words = useMemo<SourceWord[]>(
    () => (source?.sourceTranscript ?? []).map(([text, start, end, ev]) => ({ text, start, end, isEvent: ev === 1 })),
    [source]
  );
  const paras = useMemo(() => paragraphs(words), [words]);
  const keptDuration = segments.reduce((sum, s) => sum + s.end - s.start, 0);
  const dirty = !sameSegments(segments, initial);

  function update(next: Segment[]) {
    setHistory((h) => [...h.slice(-49), segments]);
    setSegments(normalize(next));
    setSelected(null);
  }

  function undo() {
    setHistory((h) => {
      if (!h.length) return h;
      setSegments(h[h.length - 1]);
      setSelected(null);
      return h.slice(0, -1);
    });
  }

  // Playback plays the EDIT: jump over grey (cut) parts.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let raf = 0;
    const tick = () => {
      const t = video.currentTime;
      if (!video.paused && !isKept(segments, t)) {
        const next = segments.find((s) => s.start > t);
        if (next) video.currentTime = next.start;
        else video.pause();
      }
      setTime(video.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [segments, source]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultPlaybackRate = rate;
      videoRef.current.playbackRate = rate;
    }
  }, [rate]);

  function seek(t: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, t));
    setTime(video.currentTime);
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (!isKept(segments, video.currentTime)) {
        const next = segments.find((s) => s.start > video.currentTime) ?? segments[0];
        if (next) video.currentTime = next.start;
      }
      void video.play();
    } else video.pause();
  }

  // ── Timeline geometry
  const contentWidth = Math.max(timelineWidth, timelineWidth * zoom);
  const pxPerSec = duration > 0 ? contentWidth / duration : 1;
  const x = (t: number) => t * pxPerSec;
  const rulerStep = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600].find((step) => step * pxPerSec >= 70) ?? 600;

  const bars = useMemo(() => {
    const peaks = source?.sourceWaveform?.peaks ?? [];
    const perSecond = source?.sourceWaveform?.perSecond ?? 1;
    const columns = Math.max(1, Math.floor(contentWidth / 2));
    const result: Array<{ t: number; v: number }> = [];
    for (let c = 0; c < columns; c++) {
      const t0 = (c / columns) * duration;
      const t1 = ((c + 1) / columns) * duration;
      let v = 0;
      for (let i = Math.floor(t0 * perSecond); i < Math.ceil(t1 * perSecond) && i < peaks.length; i++) v = Math.max(v, peaks[i]);
      result.push({ t: (t0 + t1) / 2, v });
    }
    return result;
  }, [source, contentWidth, duration]);

  // One filled, mirrored waveform shape (like Loom) instead of separate bars.
  const wavePath = useMemo(() => {
    if (!bars.length) return "";
    const mid = TIMELINE_HEIGHT / 2;
    const amp = (v: number) => Math.max(1.5, v * (TIMELINE_HEIGHT / 2 - 10));
    const step = contentWidth / bars.length;
    const top = bars.map((b, i) => `${(i * step + step / 2).toFixed(1)},${(mid - amp(b.v)).toFixed(1)}`);
    const bottom = bars.map((b, i) => `${(i * step + step / 2).toFixed(1)},${(mid + amp(b.v)).toFixed(1)}`).reverse();
    return `M0,${mid} L${top.join(" L")} L${contentWidth},${mid} L${bottom.join(" L")} Z`;
  }, [bars, contentWidth]);

  function timeFromEvent(event: { clientX: number }) {
    const el = timelineRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(duration, (event.clientX - rect.left + el.scrollLeft) / pxPerSec));
  }

  useEffect(() => {
    function onMove(event: MouseEvent) {
      const d = drag.current;
      if (!d) return;
      const t = timeFromEvent(event);
      setSegments((segs) => {
        const next = segs.map((s) => ({ ...s }));
        const seg = next[d.index];
        if (!seg) return segs;
        if (d.edge === "start") {
          const min = d.index > 0 ? next[d.index - 1].end + 0.05 : 0;
          seg.start = Math.min(Math.max(t, min), seg.end - MIN_SEGMENT);
        } else {
          const max = d.index < next.length - 1 ? next[d.index + 1].start - 0.05 : duration;
          seg.end = Math.max(Math.min(t, max), seg.start + MIN_SEGMENT);
        }
        return next;
      });
    }
    function onUp() {
      if (drag.current) drag.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pxPerSec, duration]);

  const playheadSegment = segments.findIndex((s) => time >= s.start && time < s.end);
  const canSplit = playheadSegment >= 0 && time - segments[playheadSegment].start > 0.2 && segments[playheadSegment].end - time > 0.2;
  const gapAtPlayhead = playheadSegment < 0 && duration > 0;

  function split() {
    if (!canSplit) return;
    const seg = segments[playheadSegment];
    const next = [...segments];
    next.splice(playheadSegment, 1, { start: seg.start, end: time }, { start: time, end: seg.end });
    setHistory((h) => [...h.slice(-49), segments]);
    setSegments(next); // not normalized on purpose: keep the two halves separate so one can be deleted
    setSelected(playheadSegment + 1);
  }

  function deleteSelected() {
    if (selected === null) return;
    update(segments.filter((_, i) => i !== selected));
  }

  function restoreGapAtPlayhead() {
    const before = [...segments].reverse().find((s) => s.end <= time);
    const after = segments.find((s) => s.start > time);
    update(union(segments, before ? before.end : 0, after ? after.start : duration));
  }

  // ── Transcript selection → remove / restore
  function wordRangeTimes(from: number, to: number): [number, number] {
    const a = words[from];
    const b = words[to];
    const prev = words[from - 1];
    const next = words[to + 1];
    const start = prev ? (prev.end + a.start) / 2 : Math.max(0, a.start - 0.1);
    const end = next ? (b.end + next.start) / 2 : Math.min(duration, b.end + 0.2);
    return [start, end];
  }

  useEffect(() => {
    function onUp() {
      const d = textDrag.current;
      textDrag.current = null;
      // A plain click jumps there and selects that one word (so it can be removed right away).
      if (d && !d.moved) seek(words[d.anchor].start);
    }
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);

  const selectedTextKept = textRange
    ? words.slice(textRange[0], textRange[1] + 1).some((w) => isKept(segments, (w.start + w.end) / 2))
    : false;

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/video/${projectId}/manual-edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ basedOnVersion, segments: normalize(segments) }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Opslaan mislukt");
      return;
    }
    onSaved();
  }

  if (loadError) return <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>;
  if (!source) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Knip-editor laden…
      </p>
    );
  }
  if (!source.sourceProxyUrl || !duration) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Je Mac zet de volledige opname nog klaar voor de knip-editor. Dit gebeurt automatisch na de eerste versie; laat het
        programma op je Mac draaien en open dit scherm straks opnieuw.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Player (full recording, plays the edit) */}
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-3xl bg-slate-950">
            <video
              ref={videoRef}
              src={source.sourceProxyUrl}
              playsInline
              className="max-h-[60vh] w-full"
              onClick={togglePlay}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={togglePlay}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <span className="font-mono text-xs text-slate-600">
              {formatPrecise(time)} / {formatTime(duration)}
            </span>
            <span className="text-xs text-muted-foreground">
              · resultaat {formatTime(keptDuration)} ({formatTime(duration - keptDuration)} weggeknipt)
            </span>
            <span className="ml-auto flex items-center gap-1">
              {PLAYBACK_RATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRate(r)}
                  className={cn("rounded-full px-2 py-0.5 font-mono text-xs", rate === r ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
                >
                  {String(r).replace(".", ",")}×
                </button>
              ))}
            </span>
          </div>
        </div>

        {/* Full transcript: cut words struck through */}
        <div className="relative flex max-h-[60vh] min-h-[320px] flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/85">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 text-xs text-muted-foreground">
            <span>Klik op een woord om erheen te springen. Sleep over tekst om die te verwijderen of terug te zetten.</span>
          </div>
          {textRange ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
              <span className="text-xs text-slate-600">
                {formatPrecise(wordRangeTimes(textRange[0], textRange[1])[0])} → {formatPrecise(wordRangeTimes(textRange[0], textRange[1])[1])}
              </span>
              {selectedTextKept ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    const [a, b] = wordRangeTimes(textRange[0], textRange[1]);
                    update(subtract(segments, a, b));
                    setTextRange(null);
                  }}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Verwijderen
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const [a, b] = wordRangeTimes(textRange[0], textRange[1]);
                  update(union(segments, a, b));
                  setTextRange(null);
                }}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Terugzetten
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setTextRange(null)}>
                Annuleren
              </Button>
            </div>
          ) : null}
          <div className="flex-1 select-none space-y-3 overflow-y-auto p-4 text-[15px] leading-7">
            {paras.map((p) => (
              <div key={p.from} className="grid grid-cols-[44px_1fr] gap-3">
                <button type="button" onClick={() => seek(p.start)} className="pt-1 text-left font-mono text-[11px] text-muted-foreground hover:text-foreground">
                  {formatTime(p.start)}
                </button>
                <p>
                  {words.slice(p.from, p.to + 1).map((w, offset) => {
                    const i = p.from + offset;
                    const kept = isKept(segments, (w.start + w.end) / 2);
                    const active = time >= w.start && time <= w.end;
                    const inRange = textRange && i >= textRange[0] && i <= textRange[1];
                    return (
                      <span
                        key={i}
                        onMouseDown={() => {
                          textDrag.current = { anchor: i, moved: false };
                          setTextRange([i, i]);
                        }}
                        onMouseEnter={() => {
                          const d = textDrag.current;
                          if (!d) return;
                          d.moved = d.moved || i !== d.anchor;
                          setTextRange([Math.min(d.anchor, i), Math.max(d.anchor, i)]);
                        }}
                        className={cn(
                          "cursor-pointer rounded px-0.5",
                          !kept && "text-slate-400 line-through decoration-slate-400",
                          w.isEvent && "italic text-slate-400",
                          inRange && "bg-sky-100",
                          active && "bg-sky-500 text-white no-underline"
                        )}
                      >
                        {w.isEvent ? `(${w.text})` : w.text}{" "}
                      </span>
                    );
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={!canSplit} onClick={split}>
          <Scissors className="mr-1.5 h-4 w-4" /> Split op {formatPrecise(time)}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={selected === null} onClick={deleteSelected}>
          <Trash2 className="mr-1.5 h-4 w-4" /> Verwijder selectie
        </Button>
        {gapAtPlayhead ? (
          <Button type="button" size="sm" variant="outline" onClick={restoreGapAtPlayhead}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> Zet dit grijze stuk terug
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="ghost" disabled={!history.length} onClick={undo}>
          <Undo2 className="mr-1.5 h-4 w-4" /> Ongedaan maken
        </Button>
        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <ZoomOut className="h-4 w-4" />
          <input
            type="range"
            min={1}
            max={Math.max(2, Math.ceil(duration / 10))}
            step={0.5}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            aria-label="Inzoomen op de tijdlijn"
          />
          <ZoomIn className="h-4 w-4" />
        </span>
      </div>

      {/* Timeline */}
      <div ref={timelineRef} className="relative overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <div
          className="relative cursor-pointer"
          style={{ width: contentWidth, height: TIMELINE_HEIGHT + 22 }}
          onMouseDown={(event) => {
            if ((event.target as HTMLElement).dataset.handle) return;
            const t = timeFromEvent(event);
            seek(t);
            const index = segments.findIndex((s) => t >= s.start && t < s.end);
            setSelected(index >= 0 ? index : null);
          }}
        >
          {/* time ruler */}
          {Array.from({ length: Math.floor(duration / rulerStep) + 1 }).map((_, i) => {
            const t = i * rulerStep;
            return (
              <span key={t} className="absolute top-0 font-mono text-[10px] text-slate-400" style={{ left: x(t) + 2 }}>
                {formatTime(t)}
              </span>
            );
          })}
          {/* Cut parts: light grey with diagonal stripes and a grey waveform. Kept parts: blue blocks. */}
          <svg className="absolute left-0" style={{ top: 18 }} width={contentWidth} height={TIMELINE_HEIGHT}>
            <defs>
              <pattern id="cut-stripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="8" height="8" fill="#F1F5F9" />
                <line x1="0" y1="0" x2="0" y2="8" stroke="#E2E8F0" strokeWidth="4" />
              </pattern>
              <clipPath id="kept-clip">
                {segments.map((s, i) => (
                  <rect key={i} x={x(s.start)} y={0} width={Math.max(1, x(s.end) - x(s.start))} height={TIMELINE_HEIGHT} rx={10} />
                ))}
              </clipPath>
            </defs>
            <rect x={0} y={0} width={contentWidth} height={TIMELINE_HEIGHT} rx={10} fill="url(#cut-stripes)" />
            <path d={wavePath} fill="#CBD5E1" />
            <g clipPath="url(#kept-clip)">
              <rect x={0} y={0} width={contentWidth} height={TIMELINE_HEIGHT} fill="#DBEAFE" />
              <path d={wavePath} fill="#3B82F6" />
            </g>
          </svg>
          {/* kept segments: blue blocks with drag handles */}
          {segments.map((s, i) => (
            <div
              key={`${s.start}-${i}`}
              className={cn(
                "pointer-events-none absolute rounded-[10px] border-2",
                selected === i ? "border-blue-700 shadow-[0_0_0_3px_rgba(59,130,246,0.25)]" : "border-blue-500/80"
              )}
              style={{ left: x(s.start), width: Math.max(2, x(s.end) - x(s.start)), top: 18, height: TIMELINE_HEIGHT }}
            >
              {/* Drag handles only on the selected block, so short blocks keep their waveform visible. */}
              {(selected === i ? (["start", "end"] as const) : []).map((edge) => (
                <span
                  key={edge}
                  data-handle="1"
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    setHistory((h) => [...h.slice(-49), segments]);
                    drag.current = { index: i, edge };
                    setSelected(i);
                  }}
                  className="pointer-events-auto absolute top-0 bottom-0 flex cursor-ew-resize items-center justify-center bg-blue-500"
                  style={{
                    width: 10,
                    [edge === "start" ? "left" : "right"]: -2,
                    borderRadius: edge === "start" ? "8px 0 0 8px" : "0 8px 8px 0",
                  }}
                  title="Sleep om bij te knippen"
                >
                  <span className="h-5 w-0.5 rounded bg-white/90" />
                </span>
              ))}
            </div>
          ))}
          {/* playhead */}
          <div className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-red-500" style={{ left: x(time) }}>
            <span className="absolute -left-[5px] top-0 h-3 w-3 rounded-full bg-red-500" />
          </div>
        </div>
      </div>

      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={!dirty || saving || busy} onClick={() => void save()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Opslaan als nieuwe versie
        </Button>
        {dirty ? (
          <Button type="button" variant="ghost" onClick={() => update(initial)}>
            Alle wijzigingen terugdraaien
          </Button>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {busy
            ? "Je Mac maakt een nieuwe versie…"
            : dirty
              ? "Niet opgeslagen wijzigingen. Opslaan maakt op je Mac een nieuwe versie (zonder AI, binnen enkele seconden)."
              : `Toont versie v${String(basedOnVersion).padStart(3, "0")}.`}
        </span>
      </div>
    </div>
  );
}
