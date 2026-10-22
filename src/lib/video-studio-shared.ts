// Client-safe Video Studio types and constants (no server imports here).

export type VideoStepStatus = "pending" | "running" | "done" | "failed";

export type VideoStep = {
  key: string;
  label: string;
  status: VideoStepStatus;
  message?: string | null;
  updatedAt?: string;
};

export type TranscriptWord = {
  text: string;
  start: number; // seconds on the edited version
  end: number;
  src?: number | null; // start on the raw footage (set by the pipeline)
  speaker?: string | null;
};

export type TimelineSegment = { start: number; end: number; outStart: number };

export type TranscriptOverride = { sourceStart: number; sourceEnd: number; text: string };

/** A moment on a rendered version → the same moment on the raw footage. */
export function outputToSource(segments: TimelineSegment[], seconds: number) {
  for (const seg of segments) {
    if (seconds <= seg.outStart + (seg.end - seg.start) + 0.001) {
      return seg.start + Math.max(0, seconds - seg.outStart);
    }
  }
  const last = segments[segments.length - 1];
  return last ? last.end : seconds;
}

/** Replaces words [from..to] with new text; keeps timings when the word count matches. */
export function replaceTranscriptText(words: TranscriptWord[], from: number, to: number, text: string) {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const old = words.slice(from, to + 1);
  if (old.length === 0) return words;
  let replaced: TranscriptWord[];
  if (tokens.length === old.length) {
    replaced = old.map((word, i) => ({ ...word, text: tokens[i] }));
  } else {
    const start = old[0].start;
    const step = (old[old.length - 1].end - start) / Math.max(1, tokens.length);
    replaced = tokens.map((token, i) => ({
      text: token,
      start: Math.round((start + i * step) * 1000) / 1000,
      end: Math.round((start + (i + 1) * step) * 1000) / 1000,
      src: i === 0 ? old[0].src ?? null : null,
    }));
  }
  return [...words.slice(0, from), ...replaced, ...words.slice(to + 1)];
}

export type VideoMarker = { label: string; x: number; y: number };

/** Default strength of the colour match to the Instagram look (0..1). */
export const DEFAULT_COLOR_MATCH = 0.6;

// SOCIAL: edited + captions/animations · COURSE: cuts only · FINISHED: already edited elsewhere, only caption + scheduling.
export const VIDEO_MODES = ["SOCIAL", "COURSE", "FINISHED"] as const;
export type VideoMode = (typeof VIDEO_MODES)[number];
export const VIDEO_MODE_LABELS: Record<VideoMode, string> = {
  SOCIAL: "Social",
  COURSE: "Cursus",
  FINISHED: "Kant-en-klaar",
};
/** Modes that end up on Instagram (caption + scheduling). */
export const isPostable = (mode: string) => mode === "SOCIAL" || mode === "FINISHED";

export const VIDEO_PROJECT_STATUSES = [
  "WAITING_FOR_FOOTAGE",
  "PROCESSING",
  "READY_FOR_REVIEW",
  "APPLYING_FEEDBACK",
  "APPROVED",
  "FAILED",
] as const;

export type VideoProjectStatus = (typeof VIDEO_PROJECT_STATUSES)[number];

export const VIDEO_STATUS_LABELS: Record<VideoProjectStatus, string> = {
  WAITING_FOR_FOOTAGE: "Wacht op beeldmateriaal",
  PROCESSING: "Wordt bewerkt",
  READY_FOR_REVIEW: "Klaar voor review",
  APPLYING_FEEDBACK: "Feedback wordt verwerkt",
  APPROVED: "Nagekeken ✓",
  FAILED: "Mislukt",
};

export const DEFAULT_VIDEO_STEPS: VideoStep[] = [
  { key: "footage", label: "Beeldmateriaal ontvangen", status: "pending" },
  { key: "transcribe", label: "Transcriptie", status: "pending" },
  { key: "edit", label: "Knippen", status: "pending" },
  { key: "render", label: "Preview maken", status: "pending" },
  { key: "upload", label: "Klaar voor review", status: "pending" },
];

export const VIDEO_COMMENT_KINDS = ["COMMENT", "REMOVE", "CAPTION_FIX"] as const; // CAPTION_FIX: legacy, text is now edited directly

export const VIDEO_COMMENT_KIND_LABELS: Record<(typeof VIDEO_COMMENT_KINDS)[number], string> = {
  COMMENT: "Opmerking",
  REMOVE: "Weghalen",
  CAPTION_FIX: "Ondertitel aanpassen",
};

export function slugifyVideoTitle(title: string) {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const date = new Date().toISOString().slice(0, 10);
  return `${date}_${base || "video"}`;
}
