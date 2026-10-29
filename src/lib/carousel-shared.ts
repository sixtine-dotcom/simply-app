// Shared by the Carousel Studio pages and API routes (no server-only imports here).

export type CarouselSlide = {
  type: "hook" | "body" | "cta" | "proof";
  title?: string;
  kicker?: string;
  text?: string;
  keyword?: string;
  /** Own photo for this slide (templates made in the app); otherwise the carousel's background photo. */
  photo?: string;
};

export const DEFAULT_CANVA_TEMPLATE_ID = "DAHXbZyD6NQ";

export type CarouselTheme = {
  canvaTemplateId?: string;
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
  /** Bottom left in the templates with a footer line, e.g. "TIPS VAN SIX". */
  footer?: string;
};

export const DEFAULT_THEME: CarouselTheme = {
  canvaTemplateId: DEFAULT_CANVA_TEMPLATE_ID,
  background: "photo",
  backgroundColor: "#E6E1D9",
  textColor: "#3A322C",
  accentColor: "#D9C6A8",
  shade: 0.38,
  proofTitle: "450+ anderen waren jou voor",
  proofImages: [],
  template: "tips-editorial",
  label: "Darmgezondheid",
  handle: "simplyinbalance",
  footer: "Tips van Six",
};

/** Templates for slides made in the app (drawn in src/lib/carousel-render/templates.tsx, same ids). */
export const CAROUSEL_TEMPLATE_OPTIONS = [
  { id: "tips-editorial", name: "Tips editorial (zoals cola zero)", description: "Foto over de hele slide, dunne lijnen met labels boven en onder, grote smalle serif-titel en een handgetekend pijltje." },
  { id: "recap-magazine", name: "Recap magazine (zoals monthly recap)", description: "Donkere foto, nummer linksboven, serif-titel met cursieve woorden en een smalle tekstkolom. Zet **woorden** tussen sterretjes voor cursief." },
  { id: "photo-journal", name: "Photo journal (zoals One day in my life)", description: "Foto met grote serif-titel in kleine letters, verdeeld boven en onder, een polaroid en sterretjes." },
  { id: "highlights-paper", name: "Highlights papier (zoals Highlights of my year)", description: "Beige papier met een zware smalle titel, tekst en een schuine polaroid met handgeschreven onderschrift. Openingsslide met foto." },
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
