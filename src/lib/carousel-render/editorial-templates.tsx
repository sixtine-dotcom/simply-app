import type { ReactNode } from "react";
import type { CarouselTemplate, TemplateContext } from "./templates";

// Templates modelled on Sixtine's Canva favourites (Habits / cola zero, monthly business recap, One day in my life,
// Highlights of my year). Same Satori rules as templates.tsx: flexbox only, display: flex on every element with
// more than one child. In titles, **word** is set in italic (the serif accent of those designs); in body text bold.

const W = 1080;
const H = 1350;
const DISPLAY = "Instrument Serif";
const JOURNAL = "Playfair Display";
const SANS = "Montserrat";
const MONO = "DM Mono";
const HAND = "Caveat";
const CONDENSED = "Anton";
const CREAM = "#FFF6BC";

type Word = { word: string; marked: boolean };

function words(text: string | undefined): Word[] {
  const out: Word[] = [];
  for (const part of (text ?? "").split(/(\*\*.+?\*\*)/g).filter(Boolean)) {
    const marked = part.startsWith("**") && part.endsWith("**");
    for (const word of (marked ? part.slice(2, -2) : part).split(/\s+/).filter(Boolean)) {
      // Punctuation right after a **marked** part ("**keuze**.") sticks to the previous word: no space before it.
      const prev = out[out.length - 1];
      if (prev && /^[.,!?;:)]+$/.test(word)) prev.word += word;
      else out.push({ word, marked });
    }
  }
  return out;
}

function plain(text: string | undefined) {
  return (text ?? "").replace(/\*\*(.+?)\*\*/g, "$1");
}

/** Serif title: wraps word by word, **marked** words in italic. */
function Title({ text, size, align = "start", color, font = DISPLAY, lineHeight = 0.88, spacing = -2, upper = false }: {
  text: string | undefined;
  size: number;
  align?: "start" | "end" | "center";
  color: string;
  font?: string;
  lineHeight?: number;
  spacing?: number;
  upper?: boolean;
}) {
  const justify = align === "end" ? "flex-end" : align === "center" ? "center" : "flex-start";
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: justify, fontFamily: font, fontSize: size, lineHeight, letterSpacing: spacing, color }}>
      {words(text).map(({ word, marked }, i) => (
        <span key={i} style={{ marginRight: "0.2em", ...(marked ? { fontStyle: "italic" } : {}) }}>
          {upper ? word.toUpperCase() : word}
        </span>
      ))}
    </div>
  );
}

/** Body text: wraps word by word, **marked** words in bold. */
function Body({ text, size, align = "start", color, font = SANS, maxWidth, lineHeight = 1.4 }: {
  text: string | undefined;
  size: number;
  align?: "start" | "end" | "center";
  color: string;
  font?: string;
  maxWidth?: number;
  lineHeight?: number;
}) {
  if (!text) return null;
  const justify = align === "end" ? "flex-end" : align === "center" ? "center" : "flex-start";
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: justify, fontFamily: font, fontSize: size, lineHeight, color, ...(maxWidth ? { maxWidth } : {}) }}>
      {words(text).map(({ word, marked }, i) => (
        <span key={i} style={{ marginRight: "0.27em", ...(marked ? { fontWeight: 700 } : {}) }}>
          {word}
        </span>
      ))}
    </div>
  );
}

/** Title size from its length: long titles get smaller so they never run off the slide. */
function fit(text: string | undefined, sizes: [number, number, number]) {
  const t = plain(text);
  const longest = Math.max(0, ...t.split(/\s+/).map((w) => w.length));
  if (t.length <= 16 && longest <= 9) return sizes[0];
  if (t.length <= 32 && longest <= 12) return sizes[1];
  return sizes[2];
}

function Photo({ src, shade, gradient = true }: { src: string | null; shade: number; gradient?: boolean }) {
  return (
    <>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={W} height={H} style={{ position: "absolute", top: 0, left: 0, width: W, height: H, objectFit: "cover" }} />
      ) : null}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: W,
          height: H,
          backgroundImage: gradient
            ? `linear-gradient(180deg, rgba(0,0,0,${shade * 0.7}) 0%, rgba(0,0,0,${shade * 0.35}) 40%, rgba(0,0,0,${Math.min(0.85, shade + 0.25)}) 100%)`
            : `linear-gradient(180deg, rgba(0,0,0,${shade}) 0%, rgba(0,0,0,${shade}) 100%)`,
        }}
      />
    </>
  );
}

/** Hand-drawn looping arrow, as in the Habits and cola zero designs. */
function LoopArrow({ color, width = 230, flip = false, rotate = 0 }: { color: string; width?: number; flip?: boolean; rotate?: number }) {
  return (
    <svg
      width={width}
      height={width * 0.62}
      viewBox="0 0 230 142"
      style={{ transform: `${flip ? "scaleX(-1) " : ""}rotate(${rotate}deg)` }}
    >
      <path d="M6 128 C 40 120, 70 96, 74 66 C 78 36, 46 30, 42 52 C 38 76, 76 86, 112 72 C 150 58, 180 34, 214 22" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
      <path d="M194 14 L 216 21 L 202 40" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Sparkle({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path d="M50 0 C54 36 64 46 100 50 C64 54 54 64 50 100 C46 64 36 54 0 50 C36 46 46 36 50 0 Z" fill={color} />
    </svg>
  );
}

function KeywordPill({ keyword, background, color, font = SANS }: { keyword: string; background: string; color: string; font?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, alignSelf: "flex-start", marginTop: 36, padding: "20px 34px", borderRadius: 999, background, color, fontFamily: font, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
      <span>COMMENT</span>
      <span style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 400, fontSize: 46, letterSpacing: 0 }}>{keyword.toUpperCase()}</span>
    </div>
  );
}

const pad2 = (n: number) => String(n).padStart(2, "0");

// 1. Tips editorial: thin lines with small labels top and bottom, big condensed serif title, italic kicker, loop arrow.
const tipsEditorial: CarouselTemplate = {
  id: "tips-editorial",
  name: "Tips editorial (zoals cola zero)",
  description: "Foto over de hele slide, dunne lijnen met labels boven en onder, grote smalle serif-titel en een handgetekend pijltje.",
  usesPhoto: true,
  render: ({ slide, index, theme, photoUrl, label, handle, footer }) => {
    const white = "#FFFFFF";
    const isHook = slide.type === "hook";
    const isCta = slide.type === "cta";
    // Body slides alternate: right-aligned in the lower half, then left-aligned high up (as in the Habits design).
    const right = !isHook && !isCta && index % 2 === 1;
    const high = !isHook && !isCta && index % 2 === 0;
    const align = right ? "end" : "start";
    const size = isHook ? fit(slide.title, [220, 176, 136]) : fit(slide.title, [170, 138, 108]);
    const smallCaps = { fontFamily: SANS, fontSize: 22, fontWeight: 700, letterSpacing: 1.5, color: white } as const;
    return (
      <div style={{ display: "flex", position: "relative", width: W, height: H, background: theme.backgroundColor }}>
        <Photo src={photoUrl} shade={theme.shade} />
        <div style={{ display: "flex", flexDirection: "column", position: "relative", width: "100%", height: "100%", padding: "60px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 80px", ...smallCaps }}>
            <span>{label.toUpperCase()}</span>
            <span>@{handle.toUpperCase()}</span>
          </div>
          <div style={{ display: "flex", height: 2, background: "rgba(255,255,255,0.55)", marginTop: 26 }} />
          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: high ? "flex-start" : "flex-end", alignItems: right ? "flex-end" : "flex-start", padding: high ? "90px 80px 0" : "0 80px 70px" }}>
            {slide.kicker ? (
              <div style={{ display: "flex", fontFamily: DISPLAY, fontStyle: "italic", fontSize: 76, lineHeight: 1, color: white, marginBottom: 6 }}>{plain(slide.kicker)}</div>
            ) : null}
            <div style={{ display: "flex", flexDirection: right ? "row-reverse" : "row", alignItems: "flex-end", gap: 10 }}>
              <div style={{ display: "flex", maxWidth: 860 }}>
                <Title text={slide.title} size={size} align={align} color={white} />
              </div>
            </div>
            {slide.title ? (
              <div style={{ display: "flex", marginTop: 10, marginBottom: 6, alignSelf: right ? "flex-start" : "flex-end", marginRight: right ? 0 : 60 }}>
                <LoopArrow color={white} width={210} flip={right} rotate={right ? -8 : 8} />
              </div>
            ) : null}
            <Body text={slide.text} size={slide.title ? 34 : 50} align={align} color={white} maxWidth={right ? 760 : 880} lineHeight={slide.title ? 1.4 : 1.3} />
            {isCta && slide.keyword ? <KeywordPill keyword={slide.keyword} background={white} color="#1F1A17" /> : null}
          </div>
          <div style={{ display: "flex", height: 2, background: "rgba(255,255,255,0.55)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", padding: "26px 80px 0", ...smallCaps }}>
            <span>{(footer || label).toUpperCase()}</span>
            <span>SLIDE {pad2(index + 1)}</span>
          </div>
        </div>
      </div>
    );
  },
};

// 2. Recap magazine: dark photo, "01/08" top left, roman + italic serif title, a narrow column of text.
const recapMagazine: CarouselTemplate = {
  id: "recap-magazine",
  name: "Recap magazine (zoals monthly recap)",
  description: "Donkere foto, nummer linksboven, serif-titel met cursieve woorden en een smalle tekstkolom. Zet **woorden** tussen sterretjes voor cursief.",
  usesPhoto: true,
  render: ({ slide, index, total, theme, photoUrl, label, handle }) => {
    const white = "#FFFFFF";
    const isHook = slide.type === "hook";
    const flip = !isHook && index % 2 === 0;
    const size = isHook ? fit(slide.title, [150, 128, 104]) : fit(slide.title, [132, 112, 92]);
    const small = { fontFamily: SANS, fontSize: 26, fontWeight: 400, letterSpacing: 0.5, color: white } as const;
    return (
      <div style={{ display: "flex", position: "relative", width: W, height: H, background: theme.backgroundColor }}>
        <Photo src={photoUrl} shade={Math.max(theme.shade, 0.3)} gradient={false} />
        <div style={{ display: "flex", flexDirection: "column", position: "relative", width: "100%", height: "100%", padding: "100px 100px 90px" }}>
          <div style={{ display: "flex", ...small }}>
            {pad2(index + 1)}/{pad2(total)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: isHook ? "center" : "flex-start", alignItems: isHook ? "flex-end" : flip ? "flex-end" : "flex-start", paddingTop: isHook ? 0 : 150 }}>
            {slide.kicker ? (
              <div style={{ display: "flex", fontFamily: DISPLAY, fontStyle: "italic", fontSize: 64, color: white, marginBottom: 8 }}>{plain(slide.kicker)}</div>
            ) : null}
            <div style={{ display: "flex", maxWidth: isHook ? 640 : 800 }}>
              <Title text={slide.title} size={size} align={isHook || flip ? "end" : "start"} color={white} lineHeight={0.9} />
            </div>
            {slide.text ? (
              <div style={{ display: "flex", marginTop: 56, alignSelf: flip ? "flex-start" : "flex-end", width: slide.title ? 470 : 760 }}>
                <Body text={slide.text} size={slide.title ? 30 : 44} color={white} lineHeight={1.35} />
              </div>
            ) : null}
            {slide.type === "cta" && slide.keyword ? <KeywordPill keyword={slide.keyword} background={white} color="#1F1A17" /> : null}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", ...small }}>
            <span>{label}</span>
            <span>@{handle}</span>
          </div>
        </div>
      </div>
    );
  },
};

// 3. Photo journal: lowercase serif title split over the top and bottom of the photo, polaroid and sparkles.
const photoJournal: CarouselTemplate = {
  id: "photo-journal",
  name: "Photo journal (zoals One day in my life)",
  description: "Foto met grote serif-titel in kleine letters, verdeeld boven en onder, een polaroid en sterretjes.",
  usesPhoto: true,
  render: ({ slide, index, theme, photoUrl, label, handle }) => {
    const white = "#FFFFFF";
    const all = words(slide.title);
    const half = Math.ceil(all.length / 2);
    const top = all.slice(0, half).map((w) => (w.marked ? `**${w.word}**` : w.word)).join(" ").toLowerCase();
    const bottom = all.slice(half).map((w) => (w.marked ? `**${w.word}**` : w.word)).join(" ").toLowerCase();
    const size = fit(slide.title, [200, 160, 124]);
    const labelStyle = { fontFamily: JOURNAL, fontSize: 36, lineHeight: 1.05, letterSpacing: 2, color: white } as const;
    const showPolaroid = Boolean(photoUrl) && index % 2 === 1;
    return (
      <div style={{ display: "flex", position: "relative", width: W, height: H, background: theme.backgroundColor }}>
        <Photo src={photoUrl} shade={theme.shade * 0.8} />
        {showPolaroid ? (
          <div style={{ display: "flex", position: "absolute", left: 90, top: 630, width: 300, height: 356, padding: "16px 16px 64px", background: "#F2F1EB", transform: "rotate(-3deg)", boxShadow: "0 18px 40px rgba(0,0,0,0.3)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl ?? ""} alt="" width={268} height={276} style={{ objectFit: "cover", width: 268, height: 276 }} />
          </div>
        ) : null}
        <div style={{ display: "flex", position: "absolute", right: 150, top: 300 }}>
          <Sparkle size={70} color={CREAM} />
        </div>
        <div style={{ display: "flex", position: "absolute", left: 500, top: 60 }}>
          <Sparkle size={50} color={CREAM} />
        </div>
        <div style={{ display: "flex", position: "absolute", right: 110, bottom: 420 }}>
          <Sparkle size={40} color={CREAM} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", position: "relative", width: "100%", height: "100%", padding: "110px 100px 90px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ display: "flex", maxWidth: 300, ...labelStyle }}>{label.toUpperCase()}</div>
            <div style={{ display: "flex", maxWidth: 320, textAlign: "right", ...labelStyle }}>@{handle.toUpperCase()}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 60 }}>
            {slide.kicker ? <div style={{ display: "flex", fontFamily: JOURNAL, fontSize: 60, color: white, marginBottom: 10 }}>{plain(slide.kicker).toLowerCase()}</div> : null}
            <div style={{ display: "flex", maxWidth: 880 }}>
              <Title text={top} size={size} color={white} font={JOURNAL} lineHeight={0.78} spacing={-3} />
            </div>
            <div style={{ display: "flex", marginTop: 54, maxWidth: 620 }}>
              <Body text={slide.text} size={slide.title ? 32 : 48} color={white} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "flex-end", alignItems: "flex-end" }}>
            <div style={{ display: "flex", maxWidth: 760 }}>
              <Title text={bottom} size={size} align="end" color={white} font={JOURNAL} lineHeight={0.78} spacing={-3} />
            </div>
            {slide.type === "cta" && slide.keyword ? <KeywordPill keyword={slide.keyword} background={white} color="#1F1A17" /> : null}
          </div>
        </div>
      </div>
    );
  },
};

// 4. Highlights paper: beige paper with a heavy condensed title, list text and a tilted polaroid with a handwritten
// caption; the opening slide is a full photo with a centred serif title (as in "Highlights of my year").
const highlightsPaper: CarouselTemplate = {
  id: "highlights-paper",
  name: "Highlights papier (zoals Highlights of my year)",
  description: "Beige papier met een zware smalle titel, tekst en een schuine polaroid met handgeschreven onderschrift. Openingsslide met foto.",
  usesPhoto: true,
  render: ({ slide, index, total, theme, photoUrl, label, handle }) => {
    const ink = theme.textColor;
    const isHook = slide.type === "hook";
    const mono = { fontFamily: MONO, fontSize: 22, letterSpacing: 1, color: isHook ? "#FFFFFF" : ink } as const;
    const frame = (children: ReactNode) => (
      <div style={{ display: "flex", flexDirection: "column", position: "relative", width: "100%", height: "100%", padding: "60px 70px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", ...mono }}>
          <span>{label.toUpperCase()}</span>
          <span>@{handle.toUpperCase()}</span>
        </div>
        {children}
        <div style={{ display: "flex", justifyContent: "space-between", ...mono }}>
          <span>@{handle.toUpperCase()}</span>
          <span>
            {index + 1}/{total}
          </span>
        </div>
      </div>
    );
    if (isHook) {
      const white = "#FFFFFF";
      return (
        <div style={{ display: "flex", position: "relative", width: W, height: H, background: theme.backgroundColor }}>
          <Photo src={photoUrl} shade={theme.shade * 0.8} />
          <div style={{ display: "flex", position: "absolute", left: 90, top: 230 }}>
            <svg width={150} height={150} viewBox="0 0 100 100">
              <path d="M50 4 C53 38 62 47 96 50 C62 53 53 62 50 96 C47 62 38 53 4 50 C38 47 47 38 50 4 Z" fill="none" stroke={white} strokeWidth={2.5} />
            </svg>
          </div>
          {frame(
            <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center", alignItems: "center" }}>
              {slide.kicker ? <div style={{ display: "flex", fontFamily: MONO, fontSize: 30, letterSpacing: 2, color: white, marginBottom: 20 }}>{plain(slide.kicker).toUpperCase()}</div> : null}
              <div style={{ display: "flex", maxWidth: 860 }}>
                <Title text={slide.title} size={fit(slide.title, [170, 140, 110])} align="center" color={white} font={JOURNAL} lineHeight={0.95} />
              </div>
              {slide.text ? (
                <div style={{ display: "flex", fontFamily: HAND, fontSize: 64, color: white, marginTop: 20, transform: "rotate(-4deg)" }}>{plain(slide.text)}</div>
              ) : null}
              <div style={{ display: "flex", marginTop: 30 }}>
                <svg width={260} height={40} viewBox="0 0 260 40">
                  <path d="M4 22 C 80 18, 170 18, 250 20" fill="none" stroke={white} strokeWidth={3} strokeLinecap="round" />
                  <path d="M232 8 L 252 20 L 232 32" fill="none" stroke={white} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>,
          )}
        </div>
      );
    }
    const caption = slide.type === "cta" && slide.keyword ? `comment ${slide.keyword.toLowerCase()}` : plain(slide.kicker) || "";
    return (
      <div style={{ display: "flex", position: "relative", width: W, height: H, background: theme.backgroundColor, color: ink }}>
        {photoUrl ? (
          <div style={{ display: "flex", flexDirection: "column", position: "absolute", right: 60, top: 420, width: 470, padding: "22px 22px 0", background: "#FFFFFF", transform: "rotate(5deg)", boxShadow: "0 22px 50px rgba(0,0,0,0.22)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="" width={426} height={520} style={{ objectFit: "cover", width: 426, height: 520 }} />
            <div style={{ display: "flex", height: 120, alignItems: "center", justifyContent: "center", fontFamily: HAND, fontSize: 54, color: "#2A2522" }}>{caption}</div>
          </div>
        ) : null}
        <div style={{ display: "flex", position: "absolute", right: 260, top: 260 }}>
          <svg width={140} height={140} viewBox="0 0 100 100">
            <path d="M50 4 C53 38 62 47 96 50 C62 53 53 62 50 96 C47 62 38 53 4 50 C38 47 47 38 50 4 Z" fill="none" stroke="#FFFFFF" strokeWidth={3} />
          </svg>
        </div>
        {frame(
          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, paddingTop: 170 }}>
            <div style={{ display: "flex", maxWidth: photoUrl ? 520 : 900 }}>
              <Title text={slide.title} size={fit(slide.title, [130, 110, 88])} color={ink} font={CONDENSED} lineHeight={1.02} spacing={-2} />
            </div>
            <div style={{ display: "flex", marginTop: 40, maxWidth: photoUrl ? 470 : 880 }}>
              <Body text={slide.text} size={slide.title ? 32 : 44} color={ink} lineHeight={1.45} />
            </div>
            {slide.type === "cta" && slide.keyword && !photoUrl ? <KeywordPill keyword={slide.keyword} background={ink} color={theme.backgroundColor} /> : null}
          </div>,
        )}
      </div>
    );
  },
};

export const EDITORIAL_TEMPLATES: CarouselTemplate[] = [tipsEditorial, recapMagazine, photoJournal, highlightsPaper];
export type { TemplateContext };
