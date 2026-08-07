export type LandingPageBlockType =
  | "heading"
  | "text"
  | "image"
  | "video"
  | "product"
  | "calendly"
  | "cta"
  | "testimonials"
  | "faq"
  | "pricing";

export interface LandingPageBlock {
  id?: string;
  type: LandingPageBlockType;
  level?: number;
  text?: string;
  content?: string;
  url?: string;
  alt?: string;
  provider?: "vimeo" | "loom";
  videoId?: string;
  productHandle?: string;
  embedUrl?: string;
  label?: string;
  href?: string;
  primary?: boolean;
  items?: Array<{
    quote?: string;
    name?: string;
    role?: string;
    question?: string;
    answer?: string;
    text?: string;
  }>;
  title?: string;
  price?: string;
  priceSuffix?: string;
  buttonLabel?: string;
  buttonHref?: string;
}

export const LANDING_PAGE_TABS = [
  { id: "overview", label: "Overzicht" },
  { id: "editor", label: "Editor" },
  { id: "forms", label: "Formulieren" },
  { id: "seo", label: "SEO" },
  { id: "tracking", label: "Tracking" },
  { id: "analytics", label: "Analytics" },
  { id: "automations", label: "Automations" },
  { id: "delivery", label: "Delivery" },
  { id: "settings", label: "Settings" },
] as const;

export type LandingPageTab = (typeof LANDING_PAGE_TABS)[number]["id"];

export const LANDING_PAGE_TAB_SET = new Set<string>(LANDING_PAGE_TABS.map((tab) => tab.id));

export function getLandingPageTab(value: string | undefined): LandingPageTab {
  if (value && LANDING_PAGE_TAB_SET.has(value)) {
    return value as LandingPageTab;
  }

  return "overview";
}

export function getLandingPageBlocks(input: unknown): LandingPageBlock[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((block): block is LandingPageBlock => {
    if (!block || typeof block !== "object") {
      return false;
    }

    return "type" in block && typeof block.type === "string";
  });
}

export function getLandingPageBlockCount(blocks: LandingPageBlock[], type: LandingPageBlockType) {
  return blocks.filter((block) => block.type === type).length;
}

export function getLandingPagePrimaryCtaCount(blocks: LandingPageBlock[]) {
  return blocks.filter((block) => block.type === "cta" && block.primary !== false).length;
}

export function getLandingPageCompletionScore(blocks: LandingPageBlock[], headline?: string | null, subheadline?: string | null) {
  let score = 0;

  if (headline?.trim()) score += 20;
  if (subheadline?.trim()) score += 10;
  if (getLandingPageBlockCount(blocks, "cta") > 0) score += 20;
  if (getLandingPageBlockCount(blocks, "testimonials") > 0) score += 15;
  if (getLandingPageBlockCount(blocks, "faq") > 0) score += 10;
  if (
    getLandingPageBlockCount(blocks, "video") > 0 ||
    getLandingPageBlockCount(blocks, "image") > 0
  ) {
    score += 10;
  }
  if (
    getLandingPageBlockCount(blocks, "product") > 0 ||
    getLandingPageBlockCount(blocks, "pricing") > 0 ||
    getLandingPageBlockCount(blocks, "calendly") > 0
  ) {
    score += 15;
  }

  return Math.min(score, 100);
}
