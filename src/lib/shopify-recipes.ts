/**
 * Sync recipes from simplyinbalance.com via the public Atom feed.
 * Feed URL: https://simplyinbalance.com/blogs/recepten.atom
 */
import { normalizeRecipeTags } from "@/lib/recipe-tags";
import recipeSlugAliases from "@/lib/recipe-slug-aliases.json";

const FEED_URL =
  process.env.RECIPES_SOURCE_URL
    ? `${process.env.RECIPES_SOURCE_URL.replace(/\/$/, "")}.atom`
    : "https://simplyinbalance.com/blogs/recepten.atom";

// ── XML helpers ───────────────────────────────────────────────────────────────

function extractCdata(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, "i");
  return xml.match(re)?.[1]?.trim() ?? "";
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, "i");
  return xml.match(re)?.[1]?.trim() ?? "";
}

function parseEntries(feedXml: string) {
  const entries: Array<{
    title: string;
    slug: string;
    link: string;
    summary: string;
    content: string;
  }> = [];

  const re = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(feedXml)) !== null) {
    const e = m[1];
    const link =
      e.match(/rel="alternate"[^>]*href="([^"]+)"/)?.[1] ??
      e.match(/href="([^"]+)"[^>]*rel="alternate"/)?.[1] ??
      "";
    const slug = link.split("/").pop() ?? "";
    if (!slug) continue;
    entries.push({
      title: extractCdata(e, "title") || extractTag(e, "title"),
      slug,
      link,
      summary: extractCdata(e, "summary"),
      content: extractCdata(e, "content"),
    });
  }
  return entries;
}

// ── HTML → structured data ────────────────────────────────────────────────────

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractListItems(html: string): string[] {
  const items: string[] = [];
  const re = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = stripHtml(m[1]);
    if (text) items.push(text);
  }
  return items;
}

function extractParagraphSteps(html: string): string[] {
  const steps: string[] = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = stripHtml(m[1]).trim();
    if (!text || text.length < 5) continue;
    if (/^Bereiding\s*:?\s*$/i.test(text)) continue;
    if (shouldStopInstructionParsing(text)) break;
    // Inline bereiding: "<p>Bereiding<br>First instruction</p>"
    if (/^Bereiding/i.test(text)) {
      const cleaned = text.replace(/^Bereiding\s*:?\s*/i, "").trim();
      if (cleaned && cleaned.length > 5) steps.push(cleaned);
      continue;
    }
    steps.push(text);
  }
  return steps;
}

function shouldStopInstructionParsing(text: string): boolean {
  return [
    /heb je dit recept/i,
    /heb je (het|deze) recept/i,
    /heb je dit gemaakt/i,
    /heb je het receptje gemaakt/i,
    /vergeet.*simply/i,
    /ik gebruik de producten/i,
    /deel .* op je story/i,
    /\bsimply in balance taggen\b/i,
  ].some((pattern) => pattern.test(text));
}

function parseRecipeHtml(html: string) {
  const calories = html.match(/Calorie[^:]*:\s*(\d+)/i)?.[1];
  const protein  = html.match(/Eiwitten:\s*(\d+)/i)?.[1];
  const carbs    = html.match(/Koolhydraten:\s*(\d+)/i)?.[1];
  const fat      = html.match(/Vetten:\s*(\d+)/i)?.[1];

  // Flexible bereiding detection: works with <h3>, <p>, <div>, inline <br>, etc.
  const lower = html.toLowerCase();
  const bereidingTextPos = lower.indexOf("bereiding");

  let ingredientsHtml = html;
  let instructionsHtml = "";

  if (bereidingTextPos > -1) {
    const tagStart = html.lastIndexOf("<", bereidingTextPos);
    const splitPos = tagStart > -1 ? tagStart : bereidingTextPos;

    ingredientsHtml = html.slice(0, splitPos);

    // Find "Tips van Six" to limit instructions section
    const tipsPos = lower.indexOf("tips van six");
    const ctaMatch = lower.match(/heb je (dit|het|deze) (recept|gemaakt|receptje)/);
    const ctaPos = ctaMatch?.index ?? -1;
    const sectionEndPos = [tipsPos, ctaPos]
      .filter((pos) => pos > splitPos)
      .sort((a, b) => a - b)[0] ?? -1;
    const tipsSplitPos = sectionEndPos > splitPos ? html.lastIndexOf("<", sectionEndPos) : -1;

    instructionsHtml = tipsSplitPos > splitPos
      ? html.slice(splitPos, tipsSplitPos)
      : html.slice(splitPos);
  }

  const ingredientStrings  = extractListItems(ingredientsHtml);
  // Try <li> items first, fall back to <p> paragraphs
  let instructionStrings = extractListItems(instructionsHtml);
  if (instructionStrings.length === 0 && instructionsHtml) {
    instructionStrings = extractParagraphSteps(instructionsHtml);
  }

  return {
    ingredients:  ingredientStrings.map((text) => ({ amount: "", unit: "", ingredient: text })),
    instructions: instructionStrings.map((text, i) => ({ step: i + 1, text })),
    calories: calories ? parseInt(calories) : null,
    protein:  protein  ? parseInt(protein)  : null,
    carbs:    carbs    ? parseInt(carbs)    : null,
    fat:      fat      ? parseInt(fat)      : null,
  };
}

function parseDescription(summaryHtml: string): string {
  return stripHtml(summaryHtml).replace(/\s*Meer\s*$/, "").trim();
}

function extractImageFromHtml(html: string): string | null {
  return (
    html.match(/<img[^>]+src="([^"]+)"/i)?.[1] ??
    html.match(/<img[^>]+src='([^']+)'/i)?.[1] ??
    null
  );
}

async function fetchArticleImage(articleUrl: string): Promise<string | null> {
  try {
    const res = await fetch(articleUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return (
      html.match(/og:image"\s+content="([^"]+)"/)?.[1] ??
      html.match(/content="([^"]+)"\s+property="og:image"/)?.[1] ??
      null
    );
  } catch {
    return null;
  }
}

// ── Public sync function ──────────────────────────────────────────────────────

export async function syncRecipesFromWebsite(): Promise<{
  imported: number;
  updated: number;
  errors: number;
  importedTitles: string[];
  updatedTitles: string[];
  errorTitles: string[];
}> {
  const { db } = await import("@/lib/db");

  const feedRes = await fetch(FEED_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!feedRes.ok) throw new Error(`Feed niet bereikbaar: ${feedRes.status}`);
  const feedXml = await feedRes.text();

  const entries = parseEntries(feedXml);
  const importedTitles: string[] = [];
  const updatedTitles: string[] = [];
  const errorTitles: string[] = [];

  for (const entry of entries) {
    try {
      const parsed = parseRecipeHtml(entry.content);
      const description = parseDescription(entry.summary) || null;
      const imageUrl =
        (await fetchArticleImage(entry.link)) ??
        extractImageFromHtml(entry.content) ??
        extractImageFromHtml(entry.summary);

      const data = {
        title:        entry.title,
        description,
        imageUrl,
        ingredients:  parsed.ingredients  as never,
        instructions: parsed.instructions as never,
        calories:     parsed.calories,
        protein:      parsed.protein,
        carbs:        parsed.carbs,
        fat:          parsed.fat,
        isPublished:  true,
        tags:         normalizeRecipeTags({
          title: entry.title,
          description,
          ingredients: parsed.ingredients,
          carbs: parsed.carbs,
        }),
      };

      const alias = (recipeSlugAliases as Record<string, string>)[entry.slug];
      const slug = typeof alias === "string" ? alias : entry.slug;
      const existing = await db.recipe.findUnique({ where: { slug } });
      if (existing) {
        await db.recipe.update({
          where: { slug },
          data: {
            ...data,
            imageUrl: imageUrl ?? existing.imageUrl,
          },
        });
        updatedTitles.push(entry.title);
      } else {
        await db.recipe.create({ data: { ...data, slug } });
        importedTitles.push(entry.title);
      }
    } catch (err) {
      console.error(`Sync fout voor ${entry.title}:`, err);
      errorTitles.push(entry.title);
    }
  }

  return {
    imported: importedTitles.length,
    updated:  updatedTitles.length,
    errors:   errorTitles.length,
    importedTitles,
    updatedTitles,
    errorTitles,
  };
}
