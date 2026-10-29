import type { ReactNode } from "react";
import type { CarouselSlide, CarouselTheme } from "@/lib/carousel-shared";
import { EDITORIAL_TEMPLATES } from "./editorial-templates";

// Carousel templates rendered in the app itself (no Canva): plain React with inline styles, drawn to an image
// by Satori (next/og). Satori only supports flexbox and a subset of CSS: every element with more than one child
// needs display: flex, and there is no CSS grid, no position: fixed and no external stylesheets.

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1350;

export type TemplateContext = {
  slide: CarouselSlide;
  index: number;
  total: number;
  theme: CarouselTheme;
  /** Background photo (URL or data URI); null when the carousel has none. */
  photoUrl: string | null;
  /** Small label top left, e.g. the theme of the account ("DARMGEZONDHEID"). */
  label: string;
  /** Instagram handle top right, without @. */
  handle: string;
  /** Small text bottom left in the templates with a footer line ("TIPS VAN SIX"). */
  footer: string;
};

export type CarouselTemplate = {
  id: string;
  name: string;
  description: string;
  /** Whether the template looks its best with a background photo. */
  usesPhoto: boolean;
  render: (ctx: TemplateContext) => ReactNode;
};

const SERIF = "Playfair Display";
const SANS = "Montserrat";

/**
 * Text with **bold** words. Satori has no inline layout for mixed spans, so every word is its own span in a
 * wrapping flex row (the parent needs display: flex + flexWrap: wrap).
 */
function rich(text: string | undefined, boldWeight = 700) {
  if (!text) return null;
  const words: Array<{ word: string; bold: boolean }> = [];
  for (const part of text.split(/(\*\*.+?\*\*)/g).filter(Boolean)) {
    const bold = part.startsWith("**") && part.endsWith("**");
    for (const word of (bold ? part.slice(2, -2) : part).split(/\s+/).filter(Boolean)) {
      const prev = words[words.length - 1];
      if (prev && /^[.,!?;:)]+$/.test(word)) prev.word += word;
      else words.push({ word, bold });
    }
  }
  return words.map(({ word, bold }, i) => (
    <span key={i} style={{ marginRight: "0.27em", ...(bold ? { fontWeight: boldWeight } : {}) }}>
      {word}
    </span>
  ));
}

function plain(text: string | undefined) {
  return (text ?? "").replace(/\*\*(.+?)\*\*/g, "$1");
}

/** Title size that keeps long titles inside the slide. */
function titleSize(title: string, big: number, small: number) {
  const longestWord = Math.max(0, ...title.split(/\s+/).map((w) => w.length));
  if (title.length <= 14 && longestWord <= 9) return big;
  if (title.length <= 28 && longestWord <= 12) return Math.round((big + small) / 2);
  return small;
}

function TopBar({ label, handle, color }: { label: string; handle: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontFamily: SANS, fontSize: 26, fontWeight: 600, letterSpacing: 4, color }}>
      <span>{label.toUpperCase()}</span>
      <span>@{handle.toUpperCase()}</span>
    </div>
  );
}

function Dots({ index, total, color }: { index: number; total: number; color: string }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ width: i === index ? 36 : 12, height: 12, borderRadius: 6, background: color, opacity: i === index ? 1 : 0.4 }} />
      ))}
    </div>
  );
}

function KeywordPill({ keyword, background, color }: { keyword: string; background: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, alignSelf: "flex-start", marginTop: 40, padding: "22px 36px", borderRadius: 999, background, color, fontFamily: SANS, fontSize: 34, fontWeight: 700, letterSpacing: 2 }}>
      <span>COMMENT</span>
      <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: 44, letterSpacing: 0 }}>{keyword.toUpperCase()}</span>
    </div>
  );
}

function ProofImages({ images }: { images: string[] }) {
  const shown = images.slice(0, 3);
  const angles = [-5, 3, -2];
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexGrow: 1, gap: 0, marginTop: 40 }}>
      {shown.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          alt=""
          src={src}
          width={340}
          height={600}
          style={{ objectFit: "cover", borderRadius: 24, transform: `rotate(${angles[i]}deg)`, marginLeft: i === 0 ? 0 : -40, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}
        />
      ))}
    </div>
  );
}

/** Full-bleed photo with a soft dark shade, big serif title and white text (like "One day in my life"). */
const photoEditorial: CarouselTemplate = {
  id: "foto-editorial",
  name: "Foto editorial",
  description: "Jouw foto over de hele slide, grote serif-titel en witte tekst.",
  usesPhoto: true,
  render: ({ slide, index, total, theme, photoUrl, label, handle }) => {
    const white = "#FFFFFF";
    const title = plain(slide.title);
    const isHook = slide.type === "hook";
    const size = isHook ? titleSize(title, 190, 120) : titleSize(title, 140, 96);
    return (
      <div style={{ display: "flex", position: "relative", width: SLIDE_WIDTH, height: SLIDE_HEIGHT, background: theme.backgroundColor, color: white }}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" width={SLIDE_WIDTH} height={SLIDE_HEIGHT} style={{ position: "absolute", top: 0, left: 0, width: SLIDE_WIDTH, height: SLIDE_HEIGHT, objectFit: "cover" }} />
        ) : null}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: SLIDE_WIDTH,
            height: SLIDE_HEIGHT,
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,${theme.shade * 0.6}) 0%, rgba(0,0,0,${theme.shade * 0.25}) 35%, rgba(0,0,0,${Math.min(0.85, theme.shade + 0.3)}) 100%)`,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", position: "relative", width: "100%", height: "100%", padding: "96px 96px 90px" }}>
          <TopBar label={label} handle={handle} color={white} />
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", flexGrow: 1 }}>
            {slide.kicker ? (
              <div style={{ display: "flex", fontFamily: SANS, fontSize: 40, fontWeight: 600, letterSpacing: 6, marginBottom: 18 }}>{plain(slide.kicker).toUpperCase()}</div>
            ) : null}
            {title ? (
              <div style={{ display: "flex", fontFamily: SERIF, fontSize: size, lineHeight: 0.92, letterSpacing: -2 }}>{title}</div>
            ) : null}
            {slide.type === "proof" ? <ProofImages images={theme.proofImages ?? []} /> : null}
            {slide.text ? (
              <div style={{ display: "flex", flexWrap: "wrap", fontFamily: SANS, fontSize: 38, fontWeight: 400, lineHeight: 1.4, marginTop: 40, maxWidth: 860 }}>{rich(slide.text)}</div>
            ) : null}
            {slide.type === "cta" && slide.keyword ? <KeywordPill keyword={slide.keyword} background={white} color="#1F1A17" /> : null}
          </div>
          <div style={{ display: "flex", marginTop: 56 }}>
            <Dots index={index} total={total} color={white} />
          </div>
        </div>
      </div>
    );
  },
};

/** Calm plain background in the theme colours, serif title with an accent line: works without photos. */
const plainMagazine: CarouselTemplate = {
  id: "effen-magazine",
  name: "Effen magazine",
  description: "Rustige effen achtergrond in jouw kleuren, serif-titel met accentlijn. Geen foto nodig.",
  usesPhoto: false,
  render: ({ slide, index, total, theme, photoUrl, label, handle }) => {
    const ink = theme.textColor;
    const title = plain(slide.title);
    const isHook = slide.type === "hook";
    const size = isHook ? titleSize(title, 170, 110) : titleSize(title, 120, 84);
    return (
      <div style={{ display: "flex", flexDirection: "column", width: SLIDE_WIDTH, height: SLIDE_HEIGHT, padding: "96px 96px 90px", background: theme.backgroundColor, color: ink }}>
        <TopBar label={label} handle={handle} color={ink} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: isHook ? "center" : "flex-start", flexGrow: 1, marginTop: isHook ? 0 : 110 }}>
          {slide.kicker ? (
            <div style={{ display: "flex", fontFamily: SANS, fontSize: 36, fontWeight: 600, letterSpacing: 6, marginBottom: 24 }}>{plain(slide.kicker).toUpperCase()}</div>
          ) : null}
          {title ? <div style={{ display: "flex", fontFamily: SERIF, fontSize: size, lineHeight: 0.95, letterSpacing: -2 }}>{title}</div> : null}
          <div style={{ display: "flex", width: 160, height: 10, borderRadius: 5, background: theme.accentColor, marginTop: 48 }} />
          {isHook && photoUrl ? (
            <div style={{ display: "flex", marginTop: 56 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="" width={420} height={420} style={{ objectFit: "cover", borderRadius: 210 }} />
            </div>
          ) : null}
          {slide.type === "proof" ? <ProofImages images={theme.proofImages ?? []} /> : null}
          {slide.text ? (
            <div style={{ display: "flex", flexWrap: "wrap", fontFamily: SANS, fontSize: 42, fontWeight: 400, lineHeight: 1.45, marginTop: 48, maxWidth: 880 }}>{rich(slide.text)}</div>
          ) : null}
          {slide.type === "cta" && slide.keyword ? <KeywordPill keyword={slide.keyword} background={ink} color={theme.backgroundColor} /> : null}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 56 }}>
          <Dots index={index} total={total} color={ink} />
          <span style={{ fontFamily: SANS, fontSize: 26, fontWeight: 600, letterSpacing: 2 }}>
            {index + 1}/{total}
          </span>
        </div>
      </div>
    );
  },
};

export const CAROUSEL_TEMPLATES: CarouselTemplate[] = [...EDITORIAL_TEMPLATES, photoEditorial, plainMagazine];

export function getTemplate(id: string | null | undefined) {
  return CAROUSEL_TEMPLATES.find((t) => t.id === id) ?? CAROUSEL_TEMPLATES[0];
}
