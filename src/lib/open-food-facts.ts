type OpenFoodFactsSearchOptions = {
  region?: string;
  language?: string;
  maxResults?: number;
};

type OpenFoodFactsBarcodeOptions = {
  region?: string;
  language?: string;
};

export type FoodServing = {
  id: string;
  description: string;
  metricAmount: number | null;
  metricUnit: string | null;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
};

export type FoodSearchResult = {
  id: string;
  name: string;
  brandName: string | null;
  description: string | null;
  foodType: string | null;
  url: string | null;
  imageUrl: string | null;
  servings: FoodServing[];
};

type OpenFoodFactsProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  image_front_url?: string;
  serving_size?: string;
  quantity?: string;
  product_quantity?: number;
  product_quantity_unit?: string;
  nutriments?: Record<string, number | string | undefined>;
};

const OPEN_FOOD_FACTS_BASE_URL = "https://world.openfoodfacts.org";
const PRODUCT_FIELDS = [
  "code",
  "product_name",
  "brands",
  "image_front_url",
  "serving_size",
  "quantity",
  "product_quantity",
  "product_quantity_unit",
  "nutriments",
].join(",");

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = Number(value.replace(",", "."));
    if (Number.isFinite(normalized)) {
      return normalized;
    }
  }

  return null;
}

function roundMacro(value: number | null): number {
  if (value === null) {
    return 0;
  }

  return Math.round(value * 10) / 10;
}

function getCalories(nutriments: Record<string, number | string | undefined>, suffix: "_serving" | "_100g") {
  return (
    toNumber(nutriments[`energy-kcal${suffix}`]) ??
    toNumber(nutriments[`energy-kcal${suffix === "_100g" ? "_100ml" : suffix}`]) ??
    toNumber(nutriments[`energy-kcal${suffix === "_serving" ? "" : suffix}`]) ??
    null
  );
}

function getMacro(
  nutriments: Record<string, number | string | undefined>,
  key: "carbohydrates" | "proteins" | "fat" | "fiber",
  suffix: "_serving" | "_100g"
) {
  return (
    toNumber(nutriments[`${key}${suffix}`]) ??
    toNumber(nutriments[`${key}${suffix === "_100g" ? "_100ml" : suffix}`]) ??
    toNumber(nutriments[`${key}${suffix === "_serving" ? "" : suffix}`]) ??
    null
  );
}

function normalizeServingLabel(product: OpenFoodFactsProduct) {
  return product.serving_size?.trim() || product.quantity?.trim() || "100 g";
}

function extractMetric(product: OpenFoodFactsProduct) {
  const serving = product.serving_size?.trim();
  if (!serving) {
    return { amount: 100, unit: "g" };
  }

  const match = serving.match(/(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)/);
  if (!match) {
    return { amount: null, unit: null };
  }

  return {
    amount: toNumber(match[1]),
    unit: match[2]?.toLowerCase() || null,
  };
}

function buildServings(product: OpenFoodFactsProduct): FoodServing[] {
  const nutriments = product.nutriments ?? {};
  const metric = extractMetric(product);

  const perServingCalories = getCalories(nutriments, "_serving");
  const perServingCarbs = getMacro(nutriments, "carbohydrates", "_serving");
  const perServingProtein = getMacro(nutriments, "proteins", "_serving");
  const perServingFat = getMacro(nutriments, "fat", "_serving");
  const perServingFiber = getMacro(nutriments, "fiber", "_serving");

  const perHundredCalories = getCalories(nutriments, "_100g");
  const perHundredCarbs = getMacro(nutriments, "carbohydrates", "_100g");
  const perHundredProtein = getMacro(nutriments, "proteins", "_100g");
  const perHundredFat = getMacro(nutriments, "fat", "_100g");
  const perHundredFiber = getMacro(nutriments, "fiber", "_100g");

  const servings: FoodServing[] = [];

  if (
    perServingCalories !== null ||
    perServingCarbs !== null ||
    perServingProtein !== null ||
    perServingFat !== null ||
    perServingFiber !== null
  ) {
    servings.push({
      id: `${product.code || product.product_name || "food"}-serving`,
      description: normalizeServingLabel(product),
      metricAmount: metric.amount,
      metricUnit: metric.unit,
      calories: roundMacro(perServingCalories),
      carbs: roundMacro(perServingCarbs),
      protein: roundMacro(perServingProtein),
      fat: roundMacro(perServingFat),
      fiber: roundMacro(perServingFiber),
    });
  }

  if (
    perHundredCalories !== null ||
    perHundredCarbs !== null ||
    perHundredProtein !== null ||
    perHundredFat !== null ||
    perHundredFiber !== null
  ) {
    servings.push({
      id: `${product.code || product.product_name || "food"}-100g`,
      description: "100 g",
      metricAmount: 100,
      metricUnit: "g",
      calories: roundMacro(perHundredCalories),
      carbs: roundMacro(perHundredCarbs),
      protein: roundMacro(perHundredProtein),
      fat: roundMacro(perHundredFat),
      fiber: roundMacro(perHundredFiber),
    });
  }

  return servings;
}

function normalizeProduct(product: OpenFoodFactsProduct): FoodSearchResult | null {
  const name = product.product_name?.trim();
  const code = product.code?.trim();
  const servings = buildServings(product);

  if (!name || !code || servings.length === 0) {
    return null;
  }

  return {
    id: code,
    name,
    brandName: product.brands?.split(",")[0]?.trim() || null,
    description: product.quantity?.trim() || product.serving_size?.trim() || null,
    foodType: "packaged-food",
    url: `${OPEN_FOOD_FACTS_BASE_URL}/product/${code}`,
    imageUrl: product.image_front_url?.trim() || null,
    servings,
  };
}

async function fetchOpenFoodFacts<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Simply app - nutrition search",
    },
    next: { revalidate: 60 * 60 * 12 },
  });

  if (!response.ok) {
    throw new Error("Voedingsdatabase tijdelijk niet bereikbaar");
  }

  return (await response.json()) as T;
}

export async function searchOpenFoodFactsFoods(
  query: string,
  options: OpenFoodFactsSearchOptions = {}
) {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: String(options.maxResults ?? 12),
    lc: options.language || "nl",
    cc: options.region || "BE",
    fields: PRODUCT_FIELDS,
  });

  const data = await fetchOpenFoodFacts<{ products?: OpenFoodFactsProduct[] }>(
    `${OPEN_FOOD_FACTS_BASE_URL}/cgi/search.pl?${params.toString()}`
  );

  return (data.products ?? [])
    .map(normalizeProduct)
    .filter((product): product is FoodSearchResult => Boolean(product));
}

export async function findOpenFoodFactsFoodByBarcode(
  barcode: string,
  options: OpenFoodFactsBarcodeOptions = {}
) {
  const params = new URLSearchParams({
    fields: PRODUCT_FIELDS,
    lc: options.language || "nl",
    cc: options.region || "BE",
  });

  const data = await fetchOpenFoodFacts<{ product?: OpenFoodFactsProduct; status?: number }>(
    `${OPEN_FOOD_FACTS_BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json?${params.toString()}`
  );

  if (!data.product || data.status === 0) {
    return null;
  }

  return normalizeProduct(data.product);
}
