// Shared by the Carousel Studio pages and API routes (no server-only imports here).

export type CarouselSlide = {
  type: "hook" | "body" | "cta" | "proof";
  title?: string;
  kicker?: string;
  text?: string;
  keyword?: string;
};

export type CarouselTheme = {
  background: "photo" | "plain";
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  shade: number;
  /** Last slide: real testimonial screenshots (rotated) under this title. Empty = no proof slide. */
  proofTitle?: string;
  proofImages?: string[];
  /** Slides made in the app (no Canva): which template, and the small texts at the top of every slide. */
  template?: string;
  label?: string;
  handle?: string;
};

export const DEFAULT_THEME: CarouselTheme = {
  background: "photo",
  backgroundColor: "#E6E1D9",
  textColor: "#3A322C",
  accentColor: "#D9C6A8",
  shade: 0.38,
  proofTitle: "450+ anderen waren jou voor",
  proofImages: [],
  template: "foto-editorial",
  label: "Simply in Balance",
  handle: "simplyinbalance",
};

/** Templates for slides made in the app (drawn in src/lib/carousel-render/templates.tsx, same ids). */
export const CAROUSEL_TEMPLATE_OPTIONS = [
  { id: "foto-editorial", name: "Foto editorial", description: "Jouw foto over de hele slide, grote serif-titel en witte tekst." },
  { id: "effen-magazine", name: "Effen magazine", description: "Rustige effen achtergrond in jouw kleuren, serif-titel met accentlijn. Geen foto nodig." },
] as const;

export const CAROUSEL_STATUS_LABELS: Record<string, string> = {
  // AI carousels: text first, then Canva (filled on request in Claude), then the slides.
  WRITING: "AI schrijft…",
  DRAFT: "Tekst na te kijken",
  TEXT_APPROVED: "Klaar voor Canva",
  CANVA_REQUESTED: "Wordt gemaakt in Canva…",
  IN_CANVA: "In Canva",
  CANVA_EXPORT: "Slides worden opgehaald…",
  READY: "Na te kijken",
  APPROVED: "Goedgekeurd",
  FAILED: "Mislukt",
};

export const PUBLISH_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Ingepland",
  PUBLISHING: "Wordt gepost…",
  PUBLISHED: "Gepost",
  FAILED: "Posten mislukt",
};

export const SLIDE_TYPE_LABELS: Record<CarouselSlide["type"], string> = {
  hook: "Openingsslide",
  body: "Uitleg",
  cta: "Call-to-action",
  proof: "Getuigenis",
};

/** Words marked **like this** in the slide texts: to be set in bold in Canva (autofill cannot bold single words). */
export function boldWords(texts: Array<string | undefined>) {
  const words = new Set<string>();
  for (const t of texts) {
    const re = /\*\*(.+?)\*\*/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t ?? ""))) words.add(m[1].trim());
  }
  return Array.from(words);
}
