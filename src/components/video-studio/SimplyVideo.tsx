// Simply in Balance house style for talking-head videos.
// SHARED FILE: the Simply app has an identical copy at
// src/components/video-studio/SimplyVideo.tsx (live preview). Edit here, then run `npm run sync-style`.

import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Audio,
  Easing,
  Img,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadNotoSerifDisplay } from "@remotion/google-fonts/NotoSerifDisplay";
import { loadFont as loadFontFile } from "@remotion/fonts";
import { Lottie, LottieAnimationData } from "@remotion/lottie";
import { Gif } from "@remotion/gif";

// Captions: Poppins. Big words: Noto Serif Display, extra condensed and heavy.
const { fontFamily } = loadPoppins("normal", { weights: ["600"], subsets: ["latin"] });
// White text cards: the brand's serif title font.
const { fontFamily: serifFamily } = loadNotoSerifDisplay("normal", { weights: ["400"], subsets: ["latin"] });
// Big words use the brand display font Edges (Perfectype). The file is served by whoever renders:
// the app from /fonts/video-studio/Edges.ttf, the pipeline from the bundle's public dir.
const displayFamily = "Edges";
const loadedFonts = new Set<string>();
function useDisplayFont(url: string) {
  if (!loadedFonts.has(url)) {
    loadedFonts.add(url);
    loadFontFile({ family: displayFamily, url, format: "truetype" });
  }
}

export type StyleWord = { text: string; start: number; end: number };
export type StyleEmphasis = {
  start: number;
  end: number;
  /** When the big word(s) start; words before it are the small lead-in. */
  bigStart?: number;
  position: "behind" | "top" | "bottom" | "center";
  /** Top of the speaker's head (fraction of frame height), measured by the pipeline. */
  headY?: number | null;
};
/** originX/originY: the point zoomed in on (her face), as a fraction of the frame. */
export type StyleZoom = { start: number; end: number; scale: number; originX?: number; originY?: number };
/**
 * An animation placed on the video: a Lottie animation (LottieFiles or Google's animated emoji),
 * a short video/GIF or an image (e.g. a Canva export). x/y = centre, size = width, all as a fraction of the frame.
 */
export type StyleOverlay = {
  id: string;
  /** "motion" = a motion graphic drawn in code; src names it, e.g. "bloodSugar:spike". */
  kind: "lottie" | "video" | "image" | "motion" | "text" | "card" | "photos";
  /** kind "photos": 1-3 photos shown full screen (one after the other, or side by side as a grid). */
  srcs?: string[];
  layout?: "frame" | "grid";
  src: string;
  /** kind "text": an on-screen instruction, e.g. "Snij de ui fijn" (cooking videos cut on visuals). */
  text?: string;
  label: string;
  /** Thumbnail (GIF/PNG) for the editor's list; not used when rendering. */
  preview?: string;
  start: number;
  end: number;
  x: number;
  y: number;
  size: number;
  /** Set when the user placed or changed it by hand; the pipeline keeps it in later versions. */
  manual?: boolean;
  /** Drawn behind the speaker (uses the cut-out), like the big words. Default for motion graphics. */
  behind?: boolean;
  /** For src "chart": what to draw (filled in by Claude). */
  data?: ChartSpec;
  /** B-roll: "frame" fills the whole frame (cutaway), "window" is a rounded picture-in-picture. */
  fit?: "frame" | "window";
};

/** Sound: background music (optionally quieter while speaking), sound effects and the voice level. */
export type StyleAudio = {
  music?: { src: string; label: string; volume: number; duck: boolean } | null;
  /** 0..2, 1 = original level of the recording. */
  voiceVolume?: number;
  sfx?: Array<{ id: string; src: string; label: string; at: number; volume: number; sourceAt?: number | null }>;
};

export type ChartSpec = {
  type: "line" | "bar" | "donut" | "cycle";
  title?: string;
  /** line: 1-2 series of 5-12 values (0-100). */
  series?: Array<{ label?: string; values: number[] }>;
  /** line: labels under the x-axis (few). bar/donut/cycle: one per item. */
  labels?: string[];
  /** bar/donut: values; cycle: length of each phase (e.g. days). */
  values?: number[];
  /** line: short notes at a point index, e.g. { index: 2, text: "piek" }. */
  notes?: Array<{ index: number; text: string }>;
  unit?: string;
};

export type SimplyVideoProps = {
  videoSrc: string;
  /** URL or public-dir file name of the display font (Edges). */
  displayFontSrc?: string;
  /** The speaker cut out of the video (with alpha): big words are drawn behind it. */
  foregroundSrc?: string | null;
  words: StyleWord[];
  emphasis: StyleEmphasis[];
  zooms: StyleZoom[];
  /** Animations on top of the video (Lottie, animated emoji, own uploads). */
  overlays?: StyleOverlay[];
  /** Background music, sound effects and voice level. */
  audio?: StyleAudio;
  showCaptions?: boolean;
};

export const CAPTION_MAX_WORDS = 4;
// Fixed caption height, below the face like the Instagram videos.
const CAPTION_Y = 0.7;
const EMPHASIS_Y = { behind: 0.2, top: 0.1, center: 0.2, bottom: 0.84 } as const;
// Calm zoom: glide in as the text appears, hold a few seconds, glide back out.
const ZOOM_IN_SECONDS = 1.6;
const ZOOM_OUT_SECONDS = 1.6;

/** Short caption phrases: max 4 words, break on punctuation and pauses. */
export function captionChunks(words: StyleWord[]) {
  const chunks: StyleWord[][] = [];
  let current: StyleWord[] = [];
  words.forEach((word, i) => {
    const prev = words[i - 1];
    if (current.length && (current.length >= CAPTION_MAX_WORDS || word.start - prev.end > 0.6 || /[.,?!;:]$/.test(prev.text))) {
      chunks.push(current);
      current = [];
    }
    current.push(word);
  });
  if (current.length) chunks.push(current);
  return chunks;
}

function stripPunctuation(text: string) {
  return text.replace(/["“”'.,?!;:]+$/g, "").replace(/^["“”']+/, "");
}

/**
 * Zoom level at time t. interpolate() needs strictly increasing times, so short zooms (e.g. after
 * cutting by hand) get a simple in-and-out instead of in / hold / out.
 */
function zoomScale(zoom: StyleZoom, t: number) {
  const length = zoom.end - zoom.start;
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) } as const;
  if (length > ZOOM_IN_SECONDS + ZOOM_OUT_SECONDS + 0.02) {
    return interpolate(
      t,
      [zoom.start, zoom.start + ZOOM_IN_SECONDS, zoom.end - ZOOM_OUT_SECONDS, zoom.end],
      [1, zoom.scale, zoom.scale, 1],
      clamp
    );
  }
  return interpolate(t, [zoom.start, zoom.start + length / 2, zoom.end], [1, zoom.scale, 1], clamp);
}

function resolveSrc(src: string) {
  // Local renders pass a file name from the bundle's public dir; the app passes a URL or absolute path.
  return /^(https?:|blob:|data:|\/)/.test(src) ? src : staticFile(src);
}

export const SimplyVideo: React.FC<SimplyVideoProps> = ({
  videoSrc,
  displayFontSrc = "Edges.ttf",
  foregroundSrc,
  words,
  emphasis,
  zooms,
  overlays = [],
  audio,
  showCaptions = true,
}) => {
  useDisplayFont(resolveSrc(displayFontSrc));
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  // Punch-in zoom: ease in at the start of a zoom, ease back out at the end.
  const zoom = zooms.find((z) => Number.isFinite(z.start) && Number.isFinite(z.end) && z.end > z.start && t >= z.start && t <= z.end);
  const scale = zoom ? zoomScale(zoom, t) : 1;

  const activeEmphasis = emphasis.find((e) => t >= e.start - 0.05 && t <= e.end + 0.5);
  const wordsIn = (from: number, to: number) =>
    words
      .filter((w) => w.start >= from - 0.02 && w.end <= to + 0.02)
      .map((w) => stripPunctuation(w.text))
      .join(" ");
  const bigStart = activeEmphasis ? activeEmphasis.bigStart ?? activeEmphasis.start : 0;
  const leadText = activeEmphasis && bigStart > activeEmphasis.start + 0.02 ? wordsIn(activeEmphasis.start, bigStart - 0.03) : "";
  const emphasisText = activeEmphasis ? wordsIn(bigStart, activeEmphasis.end) : "";
  const springAt = (seconds: number) =>
    spring({ frame: frame - Math.round(seconds * fps), fps, config: { damping: 14, stiffness: 200 } });
  const leadPop = activeEmphasis ? springAt(activeEmphasis.start) : 0;
  const pop = activeEmphasis && t >= bigStart - 0.01 ? springAt(bigStart) : 0;
  const fadeOut = activeEmphasis
    ? interpolate(t, [activeEmphasis.end + 0.3, activeEmphasis.end + 0.5], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;

  const chunk = captionChunks(words).find((c) => t >= c[0].start - 0.05 && t <= c[c.length - 1].end + 0.25);
  const behind = activeEmphasis?.position === "behind" || activeEmphasis?.position === "center";
  const originX = zoom?.originX ?? 0.5;
  const originY = zoom?.originY ?? 0.38;
  const zoomStyle: React.CSSProperties = { transform: `scale(${scale})`, transformOrigin: `${originX * 100}% ${originY * 100}%` };

  // Big, but always fits on one line (extra-condensed heavy glyphs are ~0.5em wide).
  // Edges is a wide all-caps face (~0.7em per letter): big, but always on one line.
  const bigFontSize = Math.min(width * (behind ? 0.2 : 0.16), (width * 0.9) / Math.max(1, emphasisText.length * 0.7));
  const leadFontSize = Math.min(bigFontSize * 0.42, (width * 0.8) / Math.max(1, leadText.length * 0.62));
  // Head top on screen (after the zoom around the face).
  const headTopPx =
    activeEmphasis?.headY != null ? height * activeEmphasis.headY * scale - height * originY * (scale - 1) : null;
  // The big word stands above the head; only its lower edge tucks behind the hair (like the videographer's reels).
  // Not enough room above the head: show it in front, at the top.
  const tuckedTop = headTopPx != null ? headTopPx - bigFontSize * 0.36 : null;
  const roomNeeded = bigFontSize * 0.45 + (leadText ? leadFontSize * 1.2 : 0) + height * 0.04;
  const tucked = behind && Boolean(foregroundSrc) && tuckedTop != null && tuckedTop > roomNeeded;
  const bigTop = tucked
    ? tuckedTop!
    : height * (behind ? 0.16 : EMPHASIS_Y[activeEmphasis?.position ?? "top"]);

  const textShadow = tucked ? "0 2px 18px rgba(0,0,0,0.2)" : "0 3px 12px rgba(0,0,0,0.4)";
  const bigWord =
    showCaptions && activeEmphasis && (emphasisText || leadText) ? (
      <AbsoluteFill style={{ opacity: fadeOut }}>
        {leadText ? (
          <div
            style={{
              position: "absolute",
              left: width * 0.05,
              right: width * 0.05,
              top: bigTop - bigFontSize * 0.55 - leadFontSize * 0.6,
              transform: `translateY(${interpolate(leadPop, [0, 1], [leadFontSize * 0.4, 0])}px)`,
              opacity: leadPop,
              textAlign: "center",
              fontFamily: displayFamily,
              fontSize: leadFontSize,
              lineHeight: 1,
              color: "white",
              textShadow,
            }}
          >
            {leadText}
          </div>
        ) : null}
        {emphasisText ? (
          <div
            style={{
              position: "absolute",
              left: width * 0.04,
              right: width * 0.04,
              top: bigTop,
              transform: `translateY(-50%) scale(${interpolate(pop, [0, 1], [0.7, 1])})`,
              opacity: pop,
              textAlign: "center",
              whiteSpace: "nowrap",
              fontFamily: displayFamily,
              fontSize: bigFontSize,
              lineHeight: 0.9,
              color: "white",
              textShadow,
            }}
          >
            {emphasisText}
          </div>
        ) : null}
      </AbsoluteFill>
    ) : null;

  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      {audio ? <SoundTrack audio={audio} words={words} /> : null}
      <AbsoluteFill style={zoomStyle}>
        <OffthreadVideo
          src={resolveSrc(videoSrc)}
          volume={Math.max(0, Math.min(2, audio?.voiceVolume ?? 1))}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      {tucked ? bigWord : null}

      {showCaptions && foregroundSrc
        ? overlays
            .filter((o) => isBehind(o) && t >= o.start && t <= o.end + 0.3)
            .map((o) => <OverlayLayer key={o.id} overlay={o} t={t} frame={frame} />)
        : null}

      {tucked || (foregroundSrc && overlays.some((o) => isBehind(o) && t >= o.start && t <= o.end + 0.3)) ? (
        <AbsoluteFill style={zoomStyle}>
          <OffthreadVideo
            src={resolveSrc(foregroundSrc!)}
            transparent
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      ) : null}

      {!tucked ? bigWord : null}

      {showCaptions
        ? overlays
            .filter((o) => !(foregroundSrc && isBehind(o)) && t >= o.start && t <= o.end + 0.3)
            .map((o) => <OverlayLayer key={o.id} overlay={o} t={t} frame={frame} />)
        : null}

      {showCaptions && !activeEmphasis && chunk && !overlays.some((o) => o.kind === "card" && t >= o.start && t <= o.end) ? (
        <AbsoluteFill>
          <div
            style={{
              position: "absolute",
              left: width * 0.08,
              right: width * 0.08,
              top: height * CAPTION_Y,
              transform: "translateY(-50%)",
              textAlign: "center",
              fontFamily,
              fontWeight: 600,
              fontSize: width * 0.05,
              lineHeight: 1.25,
              color: "white",
              textShadow: "0 1px 4px rgba(0,0,0,0.55)",
            }}
          >
            {chunk.map((w) => w.text).join(" ")}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

// ─── Animations ───────────────────────────────────────────────────────────────

const lottieCache = new Map<string, Promise<LottieAnimationData>>();
function loadLottie(src: string) {
  if (!lottieCache.has(src)) {
    lottieCache.set(src, fetch(src).then((r) => {
      if (!r.ok) throw new Error(`Animatie laden mislukt (${r.status})`);
      return r.json();
    }));
  }
  return lottieCache.get(src)!;
}

function LottieClip({ src, startFrame }: { src: string; startFrame: number }) {
  const [data, setData] = React.useState<LottieAnimationData | null>(null);
  const [handle] = React.useState(() => delayRender(`Lottie ${src}`));
  React.useEffect(() => {
    let cancelled = false;
    loadLottie(src)
      .then((json) => !cancelled && setData(json))
      .catch(() => undefined)
      .finally(() => continueRender(handle));
    return () => {
      cancelled = true;
    };
  }, [src, handle]);
  if (!data) return null;
  return (
    <Sequence from={startFrame} layout="none">
      <Lottie animationData={data} loop style={{ width: "100%", height: "100%" }} />
    </Sequence>
  );
}

// Lines look best behind the head; bars and rings carry labels, so they stay in front.
const isBehind = (o: StyleOverlay) =>
  o.behind ?? (o.kind === "motion" && !(o.src === "chart" && o.data && o.data.type !== "line"));

function OverlayLayer({ overlay, t, frame }: { overlay: StyleOverlay; t: number; frame: number }) {
  const { fps, width, height } = useVideoConfig();
  const startFrame = Math.round(overlay.start * fps);
  const enter = spring({ frame: frame - startFrame, fps, config: { damping: 12, stiffness: 170 } });
  const exit = interpolate(t, [overlay.end, overlay.end + 0.3], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (overlay.kind === "video" && overlay.fit) {
    return <BRoll overlay={overlay} t={t} frame={frame} />;
  }
  if (overlay.kind === "card") {
    // Full white screen with one short sentence (like an editorial reel).
    const fade = Math.min(
      interpolate(t, [overlay.start, overlay.start + 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      exit
    );
    return (
      <AbsoluteFill style={{ backgroundColor: "#FAF8F4", opacity: fade, alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: width * 0.8,
            textAlign: "center",
            fontFamily: serifFamily,
            fontSize: width * ((overlay.text ?? "").length > 24 ? 0.1 : 0.13),
            lineHeight: 1.02,
            color: "#2F2A26",
            transform: `translateY(${interpolate(enter, [0, 1], [height * 0.02, 0])}px)`,
          }}
        >
          {overlay.text}
        </div>
      </AbsoluteFill>
    );
  }
  if (overlay.kind === "photos") {
    return <PhotoCutaway overlay={overlay} t={t} />;
  }
  if (overlay.kind === "text") {
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: overlay.x * width - (overlay.size * width) / 2,
            width: overlay.size * width,
            top: overlay.y * height,
            display: "flex",
            justifyContent: "center",
            opacity: Math.min(enter, exit),
            transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontWeight: 600,
              fontSize: width * 0.052,
              lineHeight: 1.25,
              color: "#2f2a26",
              background: "rgba(255,255,255,0.92)",
              borderRadius: width * 0.03,
              padding: `${width * 0.018}px ${width * 0.04}px`,
              textAlign: "center",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            }}
          >
            {overlay.text}
          </div>
        </div>
      </AbsoluteFill>
    );
  }
  const size = overlay.size * width;
  // Motion graphics are wide and low; stickers are square.
  const boxHeight = overlay.kind === "motion" ? size * (overlay.data && overlay.data.type !== "line" ? 0.72 : 0.62) : size;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          width: size,
          height: boxHeight,
          left: overlay.x * width - size / 2,
          top: overlay.y * height - boxHeight / 2,
          opacity: Math.min(enter, exit),
          transform: `scale(${interpolate(enter, [0, 1], [0.6, 1]) * interpolate(exit, [0, 1], [0.85, 1])})`,
          filter: overlay.kind === "motion" ? undefined : "drop-shadow(0 8px 18px rgba(0,0,0,0.22))",
        }}
      >
        {overlay.kind === "motion" && overlay.src === "chart" && overlay.data ? (
          <ChartGraphic spec={overlay.data} startFrame={startFrame} />
        ) : overlay.kind === "motion" ? (
          <MotionGraphic name={overlay.src} startFrame={startFrame} />
        ) : overlay.kind === "lottie" ? (
          <LottieClip src={resolveSrc(overlay.src)} startFrame={startFrame} />
        ) : overlay.kind === "video" ? (
          <Sequence from={startFrame} layout="none">
            <OffthreadVideo src={resolveSrc(overlay.src)} muted transparent style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </Sequence>
        ) : /\.gif($|\?)/i.test(overlay.src) ? (
          <Gif src={resolveSrc(overlay.src)} fit="contain" style={{ width: "100%", height: "100%" }} />
        ) : (
          <Img src={resolveSrc(overlay.src)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        )}
      </div>
    </AbsoluteFill>
  );
}

// ─── Motion graphics (drawn in code, transparent, brand style) ────────────────

/** Smooth curve through points (Catmull-Rom → cubic Bézier). */
function smoothPath(points: Array<[number, number]>) {
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

const CURVES: Record<string, Array<[number, number]>> = {
  spike: [[0, 62], [12, 60], [22, 18], [32, 74], [42, 66], [52, 22], [62, 78], [74, 64], [84, 26], [100, 70]],
  stable: [[0, 50], [16, 46], [32, 50], [48, 45], [64, 49], [80, 46], [100, 48]],
};

function DrawnLine({
  points,
  progress,
  color,
  strokeWidth,
  glow,
}: {
  points: Array<[number, number]>;
  progress: number;
  color: string;
  strokeWidth: number;
  glow: boolean;
}) {
  const ref = React.useRef<SVGPathElement>(null);
  const [tip, setTip] = React.useState<{ x: number; y: number } | null>(null);
  const d = React.useMemo(() => smoothPath(points), [points]);
  React.useLayoutEffect(() => {
    const path = ref.current;
    if (!path) return;
    const length = path.getTotalLength();
    const p = path.getPointAtLength(length * progress);
    setTip({ x: p.x, y: p.y });
  }, [progress, d]);
  return (
    <g>
      <path
        ref={ref}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - progress}
        style={glow ? { filter: `drop-shadow(0 0 2.5px ${color})` } : undefined}
      />
      {tip && progress > 0.01 && progress < 0.999 ? (
        <>
          <circle cx={tip.x} cy={tip.y} r={strokeWidth * 2.6} fill={color} opacity={0.25} />
          <circle cx={tip.x} cy={tip.y} r={strokeWidth * 1.3} fill="white" />
        </>
      ) : null}
    </g>
  );
}

function MotionGraphic({ name, startFrame }: { name: string; startFrame: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [kind, variant = "spike"] = name.split(":");
  const t = Math.max(0, (frame - startFrame) / fps);

  if (kind === "bloodSugar") {
    const draw = (delay: number) =>
      interpolate(t, [delay, delay + 2.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
    const labelIn = (at: number) => interpolate(t, [at, at + 0.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const label: React.CSSProperties = {
      position: "absolute",
      fontFamily,
      fontWeight: 600,
      fontSize: "9cqw",
      color: "white",
      textShadow: "0 1px 6px rgba(0,0,0,0.55)",
      whiteSpace: "nowrap",
    };
    const showSpike = variant !== "stable";
    const showStable = variant !== "spike";
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", containerType: "inline-size" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
          {/* soft baseline: the healthy range */}
          <line x1={0} y1={50} x2={100} y2={50} stroke="white" strokeOpacity={0.35} strokeWidth={0.6} strokeDasharray="1.5 2.5" />
          {showStable ? <DrawnLine points={CURVES.stable} progress={draw(showSpike ? 0.5 : 0.2)} color="#B9D7A8" strokeWidth={1.6} glow /> : null}
          {showSpike ? <DrawnLine points={CURVES.spike} progress={draw(0.2)} color="#FFFFFF" strokeWidth={1.8} glow /> : null}
        </svg>
        {showSpike ? (
          <>
            <span style={{ ...label, left: "14%", top: "2%", opacity: labelIn(0.9) }}>piek</span>
            <span style={{ ...label, left: "25%", top: "78%", opacity: labelIn(1.3) }}>crash</span>
          </>
        ) : null}
        {showStable ? (
          <span style={{ ...label, right: "0%", top: "30%", color: "#DDEED3", opacity: labelIn(showSpike ? 2.4 : 2.0) }}>stabiel</span>
        ) : null}
      </div>
    );
  }
  return null;
}

// ─── AI charts: Claude fills in the numbers and labels, drawn here in the house style ──

const CHART_WHITE = "#FFFFFF";
const CHART_GREEN = "#B9D7A8";
const CHART_GOLD = "#E7C98F";
const SERIES_COLORS = [CHART_WHITE, CHART_GREEN];
const SLICE_COLORS = [CHART_WHITE, CHART_GREEN, CHART_GOLD, "#F2B8A2"];

function chartLabelStyle(size = 7): React.CSSProperties {
  return {
    fontFamily,
    fontWeight: 600,
    fontSize: `${size}cqw`,
    color: "white",
    textShadow: "0 1px 6px rgba(0,0,0,0.55)",
    whiteSpace: "nowrap",
  };
}

function ChartGraphic({ spec, startFrame }: { spec: ChartSpec; startFrame: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = Math.max(0, (frame - startFrame) / fps);
  const ease = (from: number, dur: number) =>
    interpolate(t, [from, from + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const title = spec.title ? (
    <div style={{ ...chartLabelStyle(8), textAlign: "center", marginBottom: "2cqw", opacity: ease(0, 0.4) }}>{spec.title}</div>
  ) : null;

  if (spec.type === "line") {
    const series = (spec.series ?? []).slice(0, 2).filter((s) => s.values?.length >= 2);
    return (
      <div style={{ width: "100%", height: "100%", containerType: "inline-size", display: "flex", flexDirection: "column" }}>
        {title}
        <div style={{ position: "relative", flex: 1 }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            {series.map((s, si) => {
              const pts = s.values.map((v, i) => [(i / (s.values.length - 1)) * 100, 92 - Math.min(100, Math.max(0, v)) * 0.84] as [number, number]);
              return <DrawnLine key={si} points={pts} progress={ease(0.3 + si * 0.5, 2)} color={SERIES_COLORS[si]} strokeWidth={1.8} glow />;
            })}
          </svg>
          {(spec.notes ?? []).slice(0, 3).map((n, i) => {
            const s = series[0];
            if (!s || n.index < 0 || n.index >= s.values.length) return null;
            const x = Math.min(86, Math.max(14, (n.index / (s.values.length - 1)) * 100));
            const y = 92 - s.values[n.index] * 0.84;
            return (
              <span key={i} style={{ ...chartLabelStyle(7), position: "absolute", left: `${x}%`, top: `${y}%`, transform: `translate(-50%, ${s.values[n.index] > 50 ? "-140%" : "40%"})`, opacity: ease(0.3 + (n.index / s.values.length) * 2, 0.3) }}>
                {n.text}
              </span>
            );
          })}
          {series.length > 1 ? (
            <div style={{ position: "absolute", right: 0, bottom: "-12cqw", display: "flex", gap: "4cqw" }}>
              {series.map((s, i) => (
                <span key={i} style={{ ...chartLabelStyle(6), color: SERIES_COLORS[i], opacity: ease(1.5 + i * 0.4, 0.3) }}>● {s.label}</span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (spec.type === "bar") {
    const values = (spec.values ?? []).slice(0, 5);
    const max = Math.max(1, ...values);
    return (
      <div style={{ width: "100%", height: "100%", containerType: "inline-size", display: "flex", flexDirection: "column" }}>
        {title}
        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "5cqw", padding: "0 4cqw" }}>
          {values.map((v, i) => {
            const grow = ease(0.3 + i * 0.25, 0.9);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                <span style={{ ...chartLabelStyle(7), opacity: grow }}>
                  {Math.round(v * grow)}
                  {spec.unit ?? ""}
                </span>
                <div style={{ width: "100%", height: `${(v / max) * 62 * grow}%`, background: SLICE_COLORS[i % SLICE_COLORS.length], borderRadius: "2cqw 2cqw 0 0", boxShadow: "0 0 18px rgba(255,255,255,0.35)" }} />
                <span style={{ ...chartLabelStyle(5), marginTop: "1.5cqw", opacity: ease(0.2 + i * 0.25, 0.4), maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {spec.labels?.[i] ?? ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // donut and cycle: a ring of segments that draws itself
  const values = (spec.values ?? []).slice(0, 6);
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const progress = ease(0.3, 1.8);
  let acc = 0;
  return (
    <div style={{ width: "100%", height: "100%", containerType: "inline-size", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {title}
      <div style={{ position: "relative", flex: 1, aspectRatio: "1 / 1" }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", overflow: "visible", transform: "rotate(-90deg)" }}>
          {values.map((v, i) => {
            const from = acc / total;
            acc += v;
            const share = v / total;
            const shown = Math.max(0, Math.min(share, progress - from));
            return (
              <circle
                key={i}
                cx={50}
                cy={50}
                r={38}
                fill="none"
                stroke={SLICE_COLORS[i % SLICE_COLORS.length]}
                strokeWidth={spec.type === "cycle" ? 7 : 14}
                pathLength={1}
                strokeDasharray={`${Math.max(0, shown - 0.006)} 1`}
                strokeDashoffset={-from}
                style={{ filter: "drop-shadow(0 0 2px rgba(255,255,255,0.6))" }}
              />
            );
          })}
        </svg>
        {(() => {
          let acc2 = 0;
          return values.map((v, i) => {
            const mid = (acc2 + v / 2) / total;
            acc2 += v;
            const angle = mid * Math.PI * 2 - Math.PI / 2;
            const r = 58;
            return (
              <span
                key={i}
                style={{ ...chartLabelStyle(5.5), position: "absolute", left: `${50 + Math.cos(angle) * r}%`, top: `${50 + Math.sin(angle) * r}%`, transform: "translate(-50%, -50%)", opacity: ease(0.4 + mid * 1.8, 0.3) }}
              >
                {spec.labels?.[i] ?? ""}
                {spec.type === "donut" ? ` ${Math.round((v / total) * 100)}%` : ""}
              </span>
            );
          });
        })()}
      </div>
    </div>
  );
}

// ─── B-roll (stock footage, e.g. Pexels) ─────────────────────────────────────

/** 1-3 photos full screen: "frame" shows them one after the other, "grid" side by side (e.g. three plates). */
function PhotoCutaway({ overlay, t }: { overlay: StyleOverlay; t: number }) {
  const { width, height } = useVideoConfig();
  const srcs = (overlay.srcs?.length ? overlay.srcs : [overlay.src]).slice(0, 3);
  const fade = Math.min(
    interpolate(t, [overlay.start, overlay.start + 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    interpolate(t, [overlay.end, overlay.end + 0.2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  );
  const progress = interpolate(t, [overlay.start, overlay.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (overlay.layout === "grid" && srcs.length > 1) {
    const gap = width * 0.02;
    const h = (height - gap * (srcs.length + 1)) / srcs.length;
    return (
      <AbsoluteFill style={{ backgroundColor: "#FAF8F4", opacity: fade }}>
        {srcs.map((src, i) => {
          const appear = interpolate(t, [overlay.start + i * 0.25, overlay.start + i * 0.25 + 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div
              key={src}
              style={{
                position: "absolute",
                left: gap,
                right: gap,
                top: gap + i * (h + gap),
                height: h,
                borderRadius: width * 0.03,
                overflow: "hidden",
                opacity: appear,
                transform: `translateY(${interpolate(appear, [0, 1], [height * 0.02, 0])}px)`,
              }}
            >
              <Img src={resolveSrc(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.04 + progress * 0.06})` }} />
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }
  const index = Math.min(srcs.length - 1, Math.floor(progress * srcs.length));
  return (
    <AbsoluteFill style={{ opacity: fade, overflow: "hidden", backgroundColor: "black" }}>
      <Img src={resolveSrc(srcs[index])} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.04 + progress * 0.08})` }} />
    </AbsoluteFill>
  );
}

function BRoll({ overlay, t, frame }: { overlay: StyleOverlay; t: number; frame: number }) {
  const { fps, width, height } = useVideoConfig();
  const startFrame = Math.round(overlay.start * fps);
  const fadeIn = interpolate(t, [overlay.start, overlay.start + 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(t, [overlay.end, overlay.end + 0.25], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const slowZoom = interpolate(t, [overlay.start, overlay.end], [1.04, 1.12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const video = (
    <Sequence from={startFrame} layout="none">
      <OffthreadVideo src={resolveSrc(overlay.src)} muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${slowZoom})` }} />
    </Sequence>
  );
  if (overlay.fit === "frame") {
    return <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut), overflow: "hidden" }}>{video}</AbsoluteFill>;
  }
  const w = overlay.size * width;
  const h = w * 1.25;
  const pop = spring({ frame: frame - startFrame, fps, config: { damping: 14, stiffness: 160 } });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          width: w,
          height: h,
          left: overlay.x * width - w / 2,
          top: overlay.y * height - h / 2,
          borderRadius: width * 0.04,
          overflow: "hidden",
          border: `${width * 0.006}px solid white`,
          boxShadow: "0 14px 40px rgba(0,0,0,0.3)",
          opacity: Math.min(pop, fadeOut),
          transform: `scale(${interpolate(pop, [0, 1], [0.85, 1])})`,
        }}
      >
        {video}
      </div>
    </AbsoluteFill>
  );
}

// ─── Sound ───────────────────────────────────────────────────────────────────

const DUCK_LEVEL = 0.3; // music level while speaking, relative to the chosen volume
const FADE_SECONDS = 1.2;

function SoundTrack({ audio, words }: { audio: StyleAudio; words: StyleWord[] }) {
  const { fps, durationInFrames } = useVideoConfig();
  const duration = durationInFrames / fps;
  // Speaking intervals (words merged across short gaps) for ducking.
  const speech = React.useMemo(() => {
    const spans: Array<[number, number]> = [];
    for (const w of words) {
      const last = spans[spans.length - 1];
      if (last && w.start - last[1] < 0.6) last[1] = w.end;
      else spans.push([w.start, w.end]);
    }
    return spans;
  }, [words]);

  const music = audio.music;
  return (
    <>
      {music?.src ? (
        <Audio
          src={resolveSrc(music.src)}
          loop
          volume={(f) => {
            const t = f / fps;
            const fade = Math.min(1, t / FADE_SECONDS, Math.max(0, (duration - t) / FADE_SECONDS));
            let level = 1;
            if (music.duck) {
              // Smoothly dip the music around speech (0.25 s ramps).
              const distance = speech.reduce((best, [a, b]) => Math.min(best, t < a ? a - t : t > b ? t - b : 0), Infinity);
              level = interpolate(distance, [0, 0.25], [DUCK_LEVEL, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            }
            return Math.max(0, Math.min(1, music.volume)) * level * fade;
          }}
        />
      ) : null}
      {(audio.sfx ?? []).map((fx) => (
        <Sequence key={fx.id} from={Math.max(0, Math.round(fx.at * fps))} layout="none">
          <Audio src={resolveSrc(fx.src)} volume={Math.max(0, Math.min(1.5, fx.volume))} />
        </Sequence>
      ))}
    </>
  );
}
