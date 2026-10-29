// Shared by the Carousel Studio pages and API routes (no server-only imports here).

export type CarouselSlide = {
  type: "hook" | "body" | "cta" | "proof";
  title?: string;
  kicker?: string;
  text?: string;
  keyword?: string;
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
};

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
