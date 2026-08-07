type RecipeIngredient =
  | string
  | {
      ingredient?: string;
      amount?: string;
      unit?: string;
    };

interface NormalizeRecipeTagsInput {
  title: string;
  description?: string | null;
  tags?: string[];
  ingredients?: RecipeIngredient[];
  carbs?: number | null;
}

const LOW_CARB_TAGS = ["keto", "koolhydraatarm"] as const;
const PLANT_MILK_PREFIXES = [
  "kokos",
  "amandel",
  "haver",
  "rijst",
  "cashew",
  "soja",
  "hazelnoot",
  "macadamia",
];

const GLUTEN_KEYWORDS = [
  "tarwe",
  "spelt",
  "gerst",
  "rogge",
  "bulgur",
  "couscous",
  "seitan",
  "paneermeel",
  "bloem",
  "wrap",
  "pasta",
  "brood",
  "lasagne",
  "noedels",
  "croutons",
  "gluten",
];

const MAMMAL_KEYWORDS = [
  "rund",
  "runds",
  "runder",
  "kalf",
  "varken",
  "varkens",
  "spek",
  "bacon",
  "ham",
  "salami",
  "prosciutto",
  "gehakt",
  "lams",
  "lam",
  "geit",
  "wild zwijn",
];

const DAIRY_KEYWORDS = [
  "boter",
  "kaas",
  "room",
  "yoghurt",
  "kwark",
  "skyr",
  "kefir",
  "wei",
  "whey",
  "caseine",
  "mozzarella",
  "parmezaan",
  "ricotta",
  "mascarpone",
  "feta",
  "halloumi",
  "cottage cheese",
  "cream cheese",
  "philadelphia",
  "platte kaas",
  "griekse yoghurt",
  "creme fraiche",
  "crème fraîche",
];

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function getIngredientText(ingredient: RecipeIngredient): string {
  if (typeof ingredient === "string") {
    return ingredient;
  }

  return [ingredient.amount, ingredient.unit, ingredient.ingredient]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function containsDisallowedMilk(text: string): boolean {
  if (!text.includes("melk")) {
    return false;
  }

  return !PLANT_MILK_PREFIXES.some((prefix) => text.includes(`${prefix}melk`) || text.includes(`${prefix} melk`));
}

function containsDairy(text: string): boolean {
  return DAIRY_KEYWORDS.some((keyword) => {
    if (!text.includes(keyword)) {
      return false;
    }

    if (text.includes(`vegan ${keyword}`) || text.includes(`plantaardige ${keyword}`)) {
      return false;
    }

    return true;
  });
}

function qualifiesAsLowCarb(text: string, carbs?: number | null): boolean {
  if (includesAny(text, [...LOW_CARB_TAGS, "low carb", "low-carb", "lowcarb"])) {
    return true;
  }

  return carbs !== null && carbs !== undefined && carbs <= 20;
}

function qualifiesForReset(text: string, carbs?: number | null): boolean {
  if (carbs === null || carbs === undefined || carbs > 0) {
    return false;
  }

  if (includesAny(text, GLUTEN_KEYWORDS)) {
    return false;
  }

  if (includesAny(text, MAMMAL_KEYWORDS)) {
    return false;
  }

  if (containsDairy(text) || containsDisallowedMilk(text)) {
    return false;
  }

  return true;
}

export function normalizeRecipeTags(input: NormalizeRecipeTagsInput): string[] {
  const baseTags = (input.tags ?? [])
    .map(normalizeTag)
    .filter((tag) => Boolean(tag) && tag !== "reset");
  const ingredientText = (input.ingredients ?? [])
    .map((ingredient) => getIngredientText(ingredient).toLowerCase())
    .join(" ");
  const text = [input.title, input.description ?? "", ingredientText, baseTags.join(" ")]
    .join(" ")
    .toLowerCase();

  const normalized = new Set(baseTags);

  if (qualifiesAsLowCarb(text, input.carbs)) {
    normalized.add("koolhydraatarm");
  }

  if (includesAny(text, ["keto"])) {
    normalized.add("keto");
  }

  if (qualifiesForReset(text, input.carbs)) {
    normalized.add("reset");
  }

  return Array.from(normalized).sort();
}
