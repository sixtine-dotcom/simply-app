import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type MacroValues = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type NutritionReference = MacroValues & {
  per: "100g" | "100ml" | "piece" | "tbsp" | "tsp";
  gramsPerUnit?: number;
};

const ZERO_MACROS: MacroValues = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

const NUTRITION_MAP: Array<{ keywords: string[]; reference: NutritionReference }> = [
  { keywords: ["havermout", "oatmeal"], reference: { per: "100g", calories: 379, protein: 13.2, carbs: 67.7, fat: 6.5 } },
  { keywords: ["amandelmeel"], reference: { per: "100g", calories: 571, protein: 21.4, carbs: 21.4, fat: 50 } },
  { keywords: ["kokosmeel", "kokosbloem"], reference: { per: "100g", calories: 400, protein: 18, carbs: 60, fat: 14 } },
  { keywords: ["gebroken lijnzaad", "lijnzaad"], reference: { per: "100g", calories: 534, protein: 18.3, carbs: 28.9, fat: 42.2 } },
  { keywords: ["chiazaad", "chia"], reference: { per: "100g", calories: 486, protein: 16.5, carbs: 42.1, fat: 30.7 } },
  { keywords: ["walnoten", "walnoot"], reference: { per: "100g", calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2 } },
  { keywords: ["hazelnoten", "hazelnoot"], reference: { per: "100g", calories: 628, protein: 15, carbs: 17, fat: 61 } },
  { keywords: ["pecannoten", "pecan"], reference: { per: "100g", calories: 691, protein: 9.2, carbs: 13.9, fat: 72 } },
  { keywords: ["paranoten"], reference: { per: "100g", calories: 659, protein: 14.3, carbs: 11.7, fat: 67.1 } },
  { keywords: ["amandelen", "amandelschilfers", "amandelschilfers", "amandel"], reference: { per: "100g", calories: 579, protein: 21.2, carbs: 21.6, fat: 49.9 } },
  { keywords: ["pompoenpitten"], reference: { per: "100g", calories: 559, protein: 30.2, carbs: 10.7, fat: 49 } },
  { keywords: ["zonnebloempitten"], reference: { per: "100g", calories: 584, protein: 20.8, carbs: 20, fat: 51.5 } },
  { keywords: ["sesamzaad", "sesamzaadjes"], reference: { per: "100g", calories: 573, protein: 17.7, carbs: 23.4, fat: 49.7 } },
  { keywords: ["maanzaad"], reference: { per: "100g", calories: 525, protein: 18, carbs: 28.1, fat: 41.6 } },
  { keywords: ["kokosvlokken", "kokosschilfers", "kokosschilfers"], reference: { per: "100g", calories: 660, protein: 6.9, carbs: 24, fat: 65 } },
  { keywords: ["cashews", "cashew"], reference: { per: "100g", calories: 553, protein: 18.2, carbs: 30.2, fat: 43.8 } },
  { keywords: ["olijfolie"], reference: { per: "tbsp", gramsPerUnit: 13.5, calories: 119, protein: 0, carbs: 0, fat: 13.5 } },
  { keywords: ["kokosolie"], reference: { per: "tbsp", gramsPerUnit: 13.6, calories: 121, protein: 0, carbs: 0, fat: 13.5 } },
  { keywords: ["truffelolie"], reference: { per: "tbsp", gramsPerUnit: 13.5, calories: 119, protein: 0, carbs: 0, fat: 13.5 } },
  { keywords: ["groene pesto", "pesto"], reference: { per: "tbsp", gramsPerUnit: 15, calories: 80, protein: 1.5, carbs: 1.5, fat: 8 } },
  { keywords: ["gemberpasta"], reference: { per: "tbsp", gramsPerUnit: 15, calories: 20, protein: 0.3, carbs: 4, fat: 0.1 } },
  { keywords: ["currypasta", "groene currypasta"], reference: { per: "tbsp", gramsPerUnit: 15, calories: 30, protein: 0.6, carbs: 4, fat: 1 } },
  { keywords: ["pindakaas"], reference: { per: "tbsp", gramsPerUnit: 16, calories: 94, protein: 3.6, carbs: 3.2, fat: 8 } },
  { keywords: ["eiwitpoeder", "proteine poeder", "proteïne poeder", "isowey"], reference: { per: "100g", calories: 390, protein: 75, carbs: 8, fat: 6 } },
  { keywords: ["erythritol", "erytrithol", "stevia"], reference: { per: "100g", calories: 0, protein: 0, carbs: 0, fat: 0 } },
  { keywords: ["agave", "agave siroop"], reference: { per: "tbsp", gramsPerUnit: 21, calories: 64, protein: 0, carbs: 16, fat: 0 } },
  { keywords: ["honing"], reference: { per: "tbsp", gramsPerUnit: 21, calories: 64, protein: 0.1, carbs: 17.3, fat: 0 } },
  { keywords: ["banaan", "bananen"], reference: { per: "piece", gramsPerUnit: 118, calories: 105, protein: 1.3, carbs: 27, fat: 0.4 } },
  { keywords: ["appel", "appels", "appeltjes"], reference: { per: "piece", gramsPerUnit: 182, calories: 95, protein: 0.5, carbs: 25, fat: 0.3 } },
  { keywords: ["blauwe bessen", "blauwe bes", "bessen"], reference: { per: "100g", calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3 } },
  { keywords: ["dadels", "dadel"], reference: { per: "piece", gramsPerUnit: 24, calories: 67, protein: 0.4, carbs: 18, fat: 0 } },
  { keywords: ["pompoenpuree", "pompoen puree", "pompoen", "butternut"], reference: { per: "100g", calories: 26, protein: 1, carbs: 6.5, fat: 0.1 } },
  { keywords: ["avocado"], reference: { per: "100g", calories: 160, protein: 2, carbs: 8.5, fat: 14.7 } },
  { keywords: ["komkommer"], reference: { per: "100g", calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1 } },
  { keywords: ["courgette", "courgetti"], reference: { per: "100g", calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3 } },
  { keywords: ["aubergine"], reference: { per: "100g", calories: 25, protein: 1, carbs: 5.9, fat: 0.2 } },
  { keywords: ["champignons"], reference: { per: "100g", calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3 } },
  { keywords: ["broccolirijst", "broccoli"], reference: { per: "100g", calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4 } },
  { keywords: ["bloemkoolrijst", "bloemkool"], reference: { per: "100g", calories: 25, protein: 1.9, carbs: 5, fat: 0.3 } },
  { keywords: ["asperges", "groene asperges", "witte asperges"], reference: { per: "100g", calories: 20, protein: 2.2, carbs: 3.9, fat: 0.1 } },
  { keywords: ["paprika"], reference: { per: "100g", calories: 31, protein: 1, carbs: 6, fat: 0.3 } },
  { keywords: ["wortel", "wortelen"], reference: { per: "100g", calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2 } },
  { keywords: ["ajuin", "ajuinen", "ui", "rode ui"], reference: { per: "100g", calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1 } },
  { keywords: ["look", "lookteen", "looktenen"], reference: { per: "100g", calories: 149, protein: 6.4, carbs: 33.1, fat: 0.5 } },
  { keywords: ["spitskool", "sla", "ijsbergsla", "romeinse slaatjes", "rucola", "slaatjes"], reference: { per: "100g", calories: 18, protein: 1.5, carbs: 3, fat: 0.2 } },
  { keywords: ["kerstomaatjes", "tomatenblokjes", "tomatensaus", "passata", "tomaat", "tomaten"], reference: { per: "100g", calories: 30, protein: 1.4, carbs: 5.6, fat: 0.2 } },
  { keywords: ["kokosmelk"], reference: { per: "100ml", calories: 180, protein: 1.6, carbs: 3, fat: 18 } },
  { keywords: ["amandelmelk"], reference: { per: "100ml", calories: 13, protein: 0.5, carbs: 0.3, fat: 1.1 } },
  { keywords: ["sojamelk", "alpro soja", "soja natuur"], reference: { per: "100ml", calories: 33, protein: 3.3, carbs: 0.7, fat: 1.8 } },
  { keywords: ["plantaardige melk"], reference: { per: "100ml", calories: 25, protein: 1, carbs: 1.5, fat: 1.5 } },
  { keywords: ["greek style alpro yoghurt", "kokosyoghurt", "yoghurt"], reference: { per: "100g", calories: 66, protein: 4, carbs: 2.8, fat: 4.2 } },
  { keywords: ["vegan feta", "feta"], reference: { per: "100g", calories: 260, protein: 5, carbs: 3, fat: 24 } },
  { keywords: ["philadelphia", "platte kaas", "griekse yoghurt"], reference: { per: "100g", calories: 200, protein: 6, carbs: 4, fat: 18 } },
  { keywords: ["vegetarisch gehakt"], reference: { per: "100g", calories: 175, protein: 16, carbs: 6, fat: 9 } },
  { keywords: ["kalkoenspek", "kalkoenspekjes"], reference: { per: "100g", calories: 160, protein: 24, carbs: 2, fat: 6 } },
  { keywords: ["scampi", "garnalen", "grijze garnalen"], reference: { per: "100g", calories: 99, protein: 24, carbs: 0.2, fat: 0.3 } },
  { keywords: ["kipburger"], reference: { per: "100g", calories: 185, protein: 18, carbs: 4, fat: 11 } },
  { keywords: ["witte vis", "wittevis", "kabeljauw", "zeebaars"], reference: { per: "100g", calories: 95, protein: 20, carbs: 0, fat: 1.5 } },
  { keywords: ["burrata"], reference: { per: "100g", calories: 300, protein: 12, carbs: 2, fat: 25 } },
  { keywords: ["buffel mozzarella", "mozzarella"], reference: { per: "100g", calories: 280, protein: 28, carbs: 3, fat: 17 } },
  { keywords: ["wilde rijst", "rijst"], reference: { per: "100g", calories: 360, protein: 7.5, carbs: 75, fat: 1 } },
  { keywords: ["gele linzen spaghetti", "erwtenpasta", "linzen spaghetti", "boekweitpasta", "boekweit pasta"], reference: { per: "100g", calories: 340, protein: 22, carbs: 55, fat: 2.5 } },
  { keywords: ["tofu"], reference: { per: "100g", calories: 144, protein: 17.3, carbs: 2.8, fat: 8.7 } },
  { keywords: ["mozzarella"], reference: { per: "100g", calories: 280, protein: 28, carbs: 3, fat: 17 } },
  { keywords: ["eiwitten"], reference: { per: "piece", gramsPerUnit: 33, calories: 17, protein: 3.6, carbs: 0.2, fat: 0 } },
  { keywords: ["eitjes", "eieren", "ei"], reference: { per: "piece", gramsPerUnit: 50, calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8 } },
  { keywords: ["kippengehakt", "kippenreepjes", "kip"], reference: { per: "100g", calories: 143, protein: 20, carbs: 0, fat: 7 } },
  { keywords: ["zalmfilets", "gerookte zalm", "zalm"], reference: { per: "100g", calories: 208, protein: 20, carbs: 0, fat: 13 } },
  { keywords: ["tonijnsteak", "tonijn"], reference: { per: "100g", calories: 132, protein: 29, carbs: 0, fat: 1 } },
  { keywords: ["surimi"], reference: { per: "100g", calories: 99, protein: 15, carbs: 6, fat: 1 } },
  { keywords: ["edamame boontjes", "edamame"], reference: { per: "100g", calories: 121, protein: 11.9, carbs: 8.9, fat: 5.2 } },
  { keywords: ["kikkererwten"], reference: { per: "100g", calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6 } },
  { keywords: ["zoete aardappel"], reference: { per: "100g", calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1 } },
  { keywords: ["kappertjes"], reference: { per: "100g", calories: 23, protein: 2.4, carbs: 4.9, fat: 0.9 } },
  { keywords: ["olijven", "zwarte olijven"], reference: { per: "100g", calories: 116, protein: 0.8, carbs: 6.3, fat: 10.9 } },
  { keywords: ["pijnboompitten"], reference: { per: "100g", calories: 673, protein: 13.7, carbs: 13.1, fat: 68.4 } },
  { keywords: ["granaatappel"], reference: { per: "100g", calories: 83, protein: 1.7, carbs: 18.7, fat: 1.2 } },
  { keywords: ["mayonaise", "mayonnaise"], reference: { per: "tbsp", gramsPerUnit: 15, calories: 100, protein: 0.1, carbs: 0.6, fat: 11 } },
  { keywords: ["glutenvrije sojasaus", "sojasaus"], reference: { per: "tbsp", gramsPerUnit: 15, calories: 10, protein: 1, carbs: 1, fat: 0 } },
  { keywords: ["wrap"], reference: { per: "piece", gramsPerUnit: 40, calories: 120, protein: 4, carbs: 20, fat: 3 } },
  { keywords: ["rijstpapier", "spring roll"], reference: { per: "piece", gramsPerUnit: 22, calories: 35, protein: 0.5, carbs: 8, fat: 0 } },
];

const PIECE_WEIGHTS: Array<{ keywords: string[]; grams: number }> = [
  { keywords: ["courgette"], grams: 200 },
  { keywords: ["komkommer"], grams: 300 },
  { keywords: ["wortel"], grams: 80 },
  { keywords: ["ajuin", "rode ui", "ui"], grams: 110 },
  { keywords: ["paprika"], grams: 150 },
  { keywords: ["aubergine"], grams: 300 },
  { keywords: ["avocado"], grams: 150 },
  { keywords: ["citroen", "limoen"], grams: 60 },
  { keywords: ["appel"], grams: 182 },
  { keywords: ["banaan"], grams: 118 },
];

const DEFAULT_GRAMS: Array<{ keywords: string[]; grams: number }> = [
  { keywords: ["olijfolie"], grams: 15 },
  { keywords: ["kokosolie", "truffelolie"], grams: 15 },
  { keywords: ["pesto", "groene pesto"], grams: 20 },
  { keywords: ["mayonaise", "mayonnaise"], grams: 15 },
  { keywords: ["philadelphia"], grams: 30 },
  { keywords: ["gemberpasta"], grams: 15 },
  { keywords: ["currypasta"], grams: 15 },
  { keywords: ["sesamzaad", "sesamzaadjes", "geroosterde sesamzaadjes"], grams: 10 },
  { keywords: ["geroosterde amandelschilfers", "amandelschilfers"], grams: 15 },
  { keywords: ["geroosterde noten", "noten"], grams: 20 },
  { keywords: ["rucola", "sla", "spitskool", "ijsbergsla"], grams: 75 },
  { keywords: ["koriander", "basilicum", "bieslook", "verse bieslook", "verse koriander", "verse basilicum", "verse tijm"], grams: 10 },
  { keywords: ["pijpajuin"], grams: 30 },
  { keywords: ["kerstomaatjes"], grams: 120 },
  { keywords: ["komkommer"], grams: 150 },
  { keywords: ["avocado"], grams: 100 },
  { keywords: ["vegan feta", "feta"], grams: 75 },
  { keywords: ["mozzarella", "burrata"], grams: 125 },
  { keywords: ["tofu"], grams: 150 },
  { keywords: ["gerookte zalm"], grams: 100 },
  { keywords: ["kippenreepjes", "kip"], grams: 125 },
  { keywords: ["vegetarisch gehakt"], grams: 125 },
  { keywords: ["kalkoenspek"], grams: 80 },
  { keywords: ["scampi", "garnalen"], grams: 150 },
  { keywords: ["groentenmix", "wokgroenten"], grams: 250 },
  { keywords: ["pompoenblokjes", "pompoen"], grams: 200 },
  { keywords: ["zalmfilets", "zalm"], grams: 125 },
  { keywords: ["tonijnsteak", "tonijn"], grams: 150 },
  { keywords: ["edamame boontjes"], grams: 100 },
  { keywords: ["wilde rijst", "rijst"], grams: 75 },
  { keywords: ["gele linzen spaghetti", "erwtenpasta", "boekweit pasta", "boekweitpasta"], grams: 80 },
];

const SKIP_PATTERNS = [
  "optioneel",
  "tips van six",
  "zie tips",
  "bekijk de video",
  "ik heb",
  "je kan",
  "gebruik",
  "naar keuze",
  "afwerking",
  "tip",
  "plant)",
  "persoon)",
];

const RECIPE_OVERRIDES: Record<string, MacroValues> = {
  lunchmetvegetarischgehakt: { calories: 380, protein: 10, carbs: 18, fat: 28 },
  slaatjemetaspergeskerstomaatjesuitdeovenkippijnboompitten: { calories: 280, protein: 26, carbs: 7, fat: 16 },
  coeurdeboefmozzarellametvijgenenamandelschilfers: { calories: 290, protein: 11, carbs: 9, fat: 23 },
  carpacciovancoeurdegebakkenzalmenfeta1persoonboeufmet: { calories: 330, protein: 28, carbs: 5, fat: 22 },
  wokgroentenfetametgerooktezalmenvegan: { calories: 290, protein: 21, carbs: 9, fat: 18 },
  simpelslaatjemetsojascheuten: { calories: 320, protein: 27, carbs: 11, fat: 18 },
  peulvruchtenpastametkippenreepjes: { calories: 430, protein: 31, carbs: 42, fat: 12 },
  tatakivantonijnmetwokgroenten: { calories: 260, protein: 34, carbs: 10, fat: 8 },
  komkommerschijfjesmetnotenveganspreadenpecan: { calories: 210, protein: 4, carbs: 8, fat: 18 },
  geroosterdekikkererwten: { calories: 180, protein: 9, carbs: 22, fat: 6 },
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function round(value: number) {
  return Math.round(value);
}

function multiplyMacros(base: MacroValues, factor: number): MacroValues {
  return {
    calories: base.calories * factor,
    protein: base.protein * factor,
    carbs: base.carbs * factor,
    fat: base.fat * factor,
  };
}

function addMacros(a: MacroValues, b: MacroValues): MacroValues {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

function parseAmount(value?: string) {
  if (!value) return null;
  const normalized = value.replace(",", ".").trim().toLowerCase();
  if (normalized === "half" || normalized === "halve") return 0.5;
  if (normalized === "een" || normalized === "één") return 1;
  const fractionMatch = normalized.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    return Number(fractionMatch[1]) / Number(fractionMatch[2]);
  }
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}

function parseEffectiveAmount(item: { amount?: string; unit?: string; ingredient?: string }) {
  let amount = parseAmount(item.amount);
  const unit = normalize(item.unit ?? "");
  const ingredient = normalize(item.ingredient ?? "");

  if (amount === null) {
    if (unit.includes("halve") || ingredient.includes("halve ")) {
      amount = 0.5;
    } else if (unit.includes("half") || ingredient.includes("half ")) {
      amount = 0.5;
    } else {
      return null;
    }
  }

  if (unit.includes("halve") || unit.includes("half")) {
    amount *= 0.5;
  }

  return amount;
}

function findReference(text: string) {
  return NUTRITION_MAP.find((entry) => entry.keywords.some((keyword) => text.includes(keyword)));
}

function pieceWeightFor(text: string) {
  return PIECE_WEIGHTS.find((entry) => entry.keywords.some((keyword) => text.includes(keyword)))?.grams ?? null;
}

function defaultGramsFor(text: string) {
  return DEFAULT_GRAMS.find((entry) => entry.keywords.some((keyword) => text.includes(keyword)))?.grams ?? null;
}

function gramsFromIngredient(item: { ingredient?: string; amount?: string; unit?: string }) {
  const text = normalize([item.amount, item.unit, item.ingredient].filter(Boolean).join(" "));
  const ingredientText = normalize(item.ingredient ?? "");

  if (!text || SKIP_PATTERNS.some((pattern) => text.includes(pattern))) {
    return null;
  }

  if (text.split(" ").length > 10 && !/\d/.test(text)) {
    return null;
  }

  const explicitGramMatch = text.match(/(\d+(?:[.,]\d+)?)\s*g(?:ram)?\b/);
  if (explicitGramMatch) {
    return Number(explicitGramMatch[1].replace(",", "."));
  }

  const explicitMlMatch = text.match(/(\d+(?:[.,]\d+)?)\s*ml\b/);
  if (explicitMlMatch) {
    return Number(explicitMlMatch[1].replace(",", "."));
  }

  const amount = parseEffectiveAmount(item);
  const unit = normalize(item.unit ?? "");

  if (amount !== null) {
    if (unit === "gram" || unit === "g") return amount;
    if (unit === "ml") return amount;
    if (unit === "el" || unit === "eetlepel" || unit === "eetlepels") return amount * 15;
    if (unit === "kl" || unit === "koffielepel" || unit === "koffielepels" || unit === "tl") return amount * 5;
    if (unit === "schep" || unit === "schepje") return amount * 30;
    if (unit === "teentje" || unit === "teentjes") return amount * 5;
    if (unit === "blik") return amount * 240;
    if (unit === "pot" || unit === "potje") return amount * 350;
    if (unit === "zak" || unit === "zakje" || unit === "pak" || unit === "pakje") return amount * 250;
  }

  const pieceWeight = pieceWeightFor(ingredientText || text);
  if (pieceWeight && amount !== null) {
    return amount * pieceWeight;
  }

  const defaultWeight = defaultGramsFor(ingredientText || text);
  if (defaultWeight) {
    return (amount ?? 1) * defaultWeight;
  }

  return null;
}

function estimateIngredient(item: { ingredient?: string; amount?: string; unit?: string }) {
  const normalized = normalize([item.ingredient, item.unit].filter(Boolean).join(" "));
  const reference = findReference(normalized);

  if (!reference) {
    return { macros: ZERO_MACROS, matched: false };
  }

  const grams = gramsFromIngredient(item);
  if (grams === null) {
    if (reference.reference.per === "piece") {
      const amount = parseAmount(item.amount) ?? 1;
      return {
        macros: multiplyMacros(reference.reference, amount),
        matched: true,
      };
    }

    return { macros: ZERO_MACROS, matched: false };
  }

  if (reference.reference.per === "100ml" || reference.reference.per === "100g") {
    return {
      macros: multiplyMacros(reference.reference, grams / 100),
      matched: true,
    };
  }

  if (reference.reference.per === "piece" && reference.reference.gramsPerUnit) {
    return {
      macros: multiplyMacros(reference.reference, grams / reference.reference.gramsPerUnit),
      matched: true,
    };
  }

  if ((reference.reference.per === "tbsp" || reference.reference.per === "tsp") && reference.reference.gramsPerUnit) {
    return {
      macros: multiplyMacros(reference.reference, grams / reference.reference.gramsPerUnit),
      matched: true,
    };
  }

  return { macros: ZERO_MACROS, matched: false };
}

function estimateInstructionOil(instructions: Array<{ text?: string; step?: number }>, ingredientText: string): MacroValues {
  const joined = normalize(
    instructions
      .map((instruction) => instruction.text ?? "")
      .join(" ")
  );

  if (ingredientText.includes("olijfolie") || ingredientText.includes("kokosolie") || ingredientText.includes("truffelolie")) {
    return ZERO_MACROS;
  }

  if (joined.includes("olijfolie")) {
    return multiplyMacros({ calories: 119, protein: 0, carbs: 0, fat: 13.5 }, 1);
  }

  if (joined.includes("kokosolie")) {
    return multiplyMacros({ calories: 121, protein: 0, carbs: 0, fat: 13.5 }, 1);
  }

  if (joined.includes("truffelolie")) {
    return multiplyMacros({ calories: 119, protein: 0, carbs: 0, fat: 13.5 }, 1);
  }

  return ZERO_MACROS;
}

async function main() {
  const recipes = await prisma.recipe.findMany({
    where: {
      imageUrl: {
        startsWith: "/uploads/pdf-recipes/",
      },
    },
    select: {
      id: true,
      title: true,
      servings: true,
      ingredients: true,
      instructions: true,
    },
  });

  let updated = 0;
  const unmatched: Record<string, number> = {};

  for (const recipe of recipes) {
    const ingredients = recipe.ingredients as Array<{ ingredient?: string; amount?: string; unit?: string }>;
    const instructions = recipe.instructions as Array<{ text?: string; step?: number }>;
    let totals = ZERO_MACROS;
    const ingredientText = normalize(ingredients.map((item) => [item.amount, item.unit, item.ingredient].filter(Boolean).join(" ")).join(" "));

    for (const item of ingredients) {
      const result = estimateIngredient(item);
      totals = addMacros(totals, result.macros);

      if (!result.matched) {
        const label = normalize([item.amount, item.unit, item.ingredient].filter(Boolean).join(" "));
        if (label && !SKIP_PATTERNS.some((pattern) => label.includes(pattern))) {
          unmatched[label] = (unmatched[label] ?? 0) + 1;
        }
      }
    }

    totals = addMacros(totals, estimateInstructionOil(instructions, ingredientText));

    const servings = Math.max(recipe.servings || 1, 1);
    const perServing = {
      calories: round(totals.calories / servings),
      protein: round(totals.protein / servings),
      carbs: round(totals.carbs / servings),
      fat: round(totals.fat / servings),
    };

    const override = RECIPE_OVERRIDES[slugify(recipe.title).replace(/-/g, "")];
    const finalValues = override ?? perServing;

    await prisma.recipe.update({
      where: { id: recipe.id },
      data: finalValues,
    });
    updated += 1;
  }

  const topUnmatched = Object.entries(unmatched)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([ingredient, count]) => ({ ingredient, count }));

  console.log(JSON.stringify({ updated, topUnmatched }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
