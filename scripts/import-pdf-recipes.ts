import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { normalizeRecipeTags } from "../src/lib/recipe-tags";

const prisma = new PrismaClient();

const PDF_PATH = process.argv[2];
const APPLY_CHANGES = process.argv.includes("--apply");

if (!PDF_PATH) {
  console.error("Gebruik: tsx scripts/import-pdf-recipes.ts \"/pad/naar/bestand.pdf\" [--apply]");
  process.exit(1);
}

type ExtractedPage = {
  page: number;
  text: string;
};

type ParsedRecipe = {
  page: number;
  title: string;
  slug: string;
  category: string | null;
  ingredients: { ingredient: string; amount?: string; unit?: string }[];
  instructions: { step: number; text: string }[];
  tags: string[];
};

function extractPagesFromPdf(pdfPath: string): ExtractedPage[] {
  const swiftScript = `
import Foundation
import PDFKit

struct PagePayload: Codable {
  let page: Int
  let text: String
}

let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let doc = PDFDocument(url: url) else {
  fputs("Kon PDF niet openen\\n", stderr)
  exit(1)
}

let encoder = JSONEncoder()
encoder.outputFormatting = [.sortedKeys]

var payload: [PagePayload] = []
for index in 0..<doc.pageCount {
  let text = doc.page(at: index)?.string ?? ""
  payload.append(PagePayload(page: index + 1, text: text))
}

let data = try encoder.encode(payload)
FileHandle.standardOutput.write(data)
`;

  const output = execFileSync("swift", ["-e", swiftScript, pdfPath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return JSON.parse(output) as ExtractedPage[];
}

function collapseLetterSpacing(value: string): string {
  return value.replace(/\b(?:[A-Za-zÀ-ÿ]\s+){2,}[A-Za-zÀ-ÿ]\b/g, (match) =>
    match.replace(/\s+/g, "")
  );
}

function normalizeText(value: string): string {
  return collapseLetterSpacing(
    value
      .replace(/\r/g, "")
      .replace(/\u00A0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function sanitizeTitle(value: string): string {
  return normalizeText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^\d+\s+portie(?:s)?$/i.test(line))
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,:;.!?])/g, "$1")
    .trim();
}

const TITLE_HINT_WORDS = [
  "aziatische",
  "salade",
  "boontjes",
  "vegetarisch",
  "gehakt",
  "baby",
  "romeinse",
  "sla",
  "bloemkool",
  "puree",
  "boekweit",
  "pasta",
  "ricotta",
  "courgetti",
  "groene",
  "pesto",
  "kerstomaatjes",
  "oven",
  "broccoli",
  "brood",
  "coeur",
  "boeuf",
  "avocado",
  "spiegelei",
  "frisse",
  "frissesalade",
  "kippenreepjes",
  "hardgekookt",
  "eitje",
  "granaatappel",
  "edamame",
  "wortelslierten",
  "koolraap",
  "tagliatelle",
  "truffelsaus",
  "kalkoenspekjes",
  "surimisalade",
  "aubergine",
  "fleur",
  "sel",
  "cashews",
  "spruitjes",
  "wilde",
  "rijst",
  "witte",
  "kool",
  "currymet",
  "currysaus",
  "broccolirijst",
  "groentenmix",
  "taco",
  "tacos",
  "knolselder",
  "pastinaak",
  "garnalen",
  "gepocheerd",
  "koolsalade",
  "lasagne",
  "bechamelsaus",
  "overnight",
  "oats",
  "peulvruchten",
  "ovenschotel",
  "pizza",
  "poke",
  "bowl",
  "quinoa",
  "ratatouille",
  "ravioli",
  "rijstsalade",
  "scampi",
  "gember",
  "dressing",
  "simpel",
  "slaatje",
  "asperges",
  "zeekraal",
  "worteltjes",
  "mexicaanse",
  "gevulde",
  "pompoen",
  "soep",
  "wokgroenten",
  "tofu",
  "vegan",
  "feta",
  "muhammara",
  "ceviche",
  "zeebaars",
  "golden",
  "milk",
  "dalgona",
  "healthy",
  "salted",
  "caramel",
  "sweets",
  "komkommer",
  "spread",
  "pecan",
  "salade",
  "surimi",
  "spring",
  "rolls",
  "courgette",
  "kip",
  "zalm",
  "tonijnsteak",
  "zoete",
  "aardappel",
  "frietjes",
  "groentjes",
  "bloemkoolrijst",
  "nasi",
  "goreng",
  "brood",
  "met",
  "met",
  "en",
  "op",
  "basis",
  "van",
  "zonder",
  "koolhydraatarm",
  "koolhydraatarme",
  "speculaas",
  "havermout",
  "koekjes",
  "wortel",
  "zaden",
  "crackers",
  "mugcake",
  "appel",
  "crumble",
  "bananen",
  "milkshake",
  "greek",
  "style",
  "yoghurt",
  "eiwitpoeder",
  "gebakken",
  "appeltjes",
  "speculaaskruiden",
  "granola",
  "frozen",
  "smoothie",
  "gezonde",
  "pompoen",
  "wafels",
  "notenbrood",
  "kokosbrood",
  "pompoenkoekjes",
  "walnoot",
  "chai",
  "overnight",
  "chia",
  "geroosterde",
  "pudding",
  "pannenkoeken",
  "baked",
  "pumpkin",
  "oatmeal",
  "farci",
  "springrolls",
  "tzatziki",
];

function normalizeWord(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function buildTitleLexicon(ingredients: { ingredient: string; amount?: string; unit?: string }[]) {
  const lexicon = new Set(TITLE_HINT_WORDS.map(normalizeWord).filter(Boolean));

  for (const ingredient of ingredients) {
    for (const part of ingredient.ingredient.split(/\s+/)) {
      const normalized = normalizeWord(part);
      if (normalized.length >= 3) {
        lexicon.add(normalized);
      }
    }
  }

  return lexicon;
}

function segmentCompactChunk(chunk: string, lexicon: Set<string>): string[] {
  const lowerChunk = normalizeWord(chunk);
  if (!lowerChunk || lexicon.has(lowerChunk)) {
    return [chunk];
  }

  const n = lowerChunk.length;
  const bestScore = Array<number>(n + 1).fill(Number.NEGATIVE_INFINITY);
  const bestParts: string[][] = Array.from({ length: n + 1 }, () => []);
  bestScore[0] = 0;

  for (let i = 0; i < n; i += 1) {
    if (!Number.isFinite(bestScore[i])) {
      continue;
    }

    for (let j = i + 2; j <= Math.min(n, i + 24); j += 1) {
      const piece = lowerChunk.slice(i, j);
      if (!lexicon.has(piece)) {
        continue;
      }

      const score = bestScore[i] + piece.length * piece.length;
      if (score > bestScore[j]) {
        bestScore[j] = score;
        bestParts[j] = [...bestParts[i], piece];
      }
    }
  }

  if (!Number.isFinite(bestScore[n]) || bestParts[n].length <= 1) {
    return [chunk];
  }

  return bestParts[n];
}

function humanizeTitle(title: string, ingredients: { ingredient: string; amount?: string; unit?: string }[]): string {
  const lexicon = buildTitleLexicon(ingredients);
  const prepared = title
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/,/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const output: string[] = [];
  for (const token of prepared.split(/\s+/)) {
    if (/^[-/,]$/.test(token) || normalizeWord(token).length < 8) {
      output.push(token);
      continue;
    }

    const parts = segmentCompactChunk(token, lexicon);
    output.push(parts.join(" "));
  }

  const joined = output
    .join(" ")
    .replace(/\s+,/g, ",")
    .replace(/\s+([/\\-])/g, " $1")
    .replace(/([/\\-])\s+/g, "$1 ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isCategoryPage(text: string): string | null {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) {
    return null;
  }

  const upper = compact.toUpperCase();
  const categories = ["ONTBIJT", "LUNCH", "DINER", "AVONDMAAL", "SNACK", "SNACKS", "DESSERT", "TUSSENDOOR"];
  const match = categories.find((item) => upper === item);
  if (!match) {
    return null;
  }

  switch (match) {
    case "AVONDMAAL":
      return "avondmaal";
    case "SNACKS":
    case "TUSSENDOOR":
      return "snack";
    default:
      return match.toLowerCase();
  }
}

function stripMarketingCopy(text: string): string {
  const markers = [
    "Heb je dit receptje gemaakt?",
    "Heb je dit recept gemaakt?",
    "Tips van Six",
    "Tip van six",
    "Tip van Six",
    "💛💛",
    "SMAKKKKELIJKKKK!",
  ];

  let cleaned = text;
  for (const marker of markers) {
    const index = cleaned.indexOf(marker);
    if (index >= 0) {
      cleaned = cleaned.slice(0, index).trim();
    }
  }

  return cleaned.trim();
}

function cleanLine(line: string): string {
  return line
    .replace(/^[*•✅\-]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseIngredient(line: string) {
  const cleaned = cleanLine(line);
  if (!cleaned) {
    return null;
  }

  const match = cleaned.match(
    /^((?:\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+|een|één|halve?|half|snuifje|optioneel|ca\.)\s*(?:[A-Za-zÀ-ÿ.%]+)?)(?:\s+)(.+)$/i
  );

  if (!match) {
    return { ingredient: cleaned };
  }

  const amountPart = match[1].trim();
  const rest = match[2].trim();
  const amountTokens = amountPart.split(/\s+/);

  if (amountTokens.length >= 2) {
    return {
      amount: amountTokens[0],
      unit: amountTokens.slice(1).join(" "),
      ingredient: rest,
    };
  }

  return {
    amount: amountPart,
    ingredient: rest,
  };
}

function parseInstructions(text: string) {
  const lines = text
    .split("\n")
    .map((line) => cleanLine(line))
    .filter(Boolean);

  return lines.map((line, index) => ({
    step: index + 1,
    text: line,
  }));
}

function findInstructionsStartIndex(lines: string[]): number {
  const instructionStarters = [
    "verwarm",
    "verwijder",
    "breek",
    "plet",
    "voeg",
    "maak",
    "bak",
    "giet",
    "meng",
    "snij",
    "kook",
    "klop",
    "vet",
    "doe",
    "zet",
    "laat",
    "werk",
    "mix",
    "besprenkel",
    "haal",
    "leg",
    "serveer",
    "plaats",
    "verdeel",
    "breng",
    "roer",
    "spoel",
    "kruid",
    "rooster",
    "smeer",
    "was",
    "pel",
    "gebruik",
  ];

  return lines.findIndex((line) => {
    const cleaned = cleanLine(line).toLowerCase();
    return instructionStarters.some((starter) => cleaned.startsWith(starter));
  });
}

function inferResetTag(title: string, ingredients: { ingredient: string; amount?: string; unit?: string }[]): boolean {
  void title;
  void ingredients;
  return false;
}

function parseRecipes(pages: ExtractedPage[]): ParsedRecipe[] {
  const recipes: ParsedRecipe[] = [];
  let currentCategory: string | null = null;

  for (const page of pages) {
    const normalized = normalizeText(page.text);
    if (!normalized) {
      continue;
    }

    const category = isCategoryPage(normalized);
    if (category) {
      currentCategory = category;
      continue;
    }

    const ingredientsMarker = "INGREDIËNTEN";
    const instructionsMarker = "BEREIDING";

    if (!normalized.includes(ingredientsMarker) || !normalized.includes(instructionsMarker)) {
      continue;
    }

    const ingredientsIndex = normalized.indexOf(ingredientsMarker);
    const titlePart = normalized.slice(0, ingredientsIndex);
    const body = normalized
      .slice(ingredientsIndex)
      .replace(/INGREDIËNTEN\s*:\s*/g, "")
      .replace(/BEREIDING\s*:\s*/g, "")
      .trim();

    const bodyLines = body
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const instructionsStart = findInstructionsStartIndex(bodyLines);
    if (instructionsStart <= 0) {
      continue;
    }

    const ingredients = bodyLines
      .slice(0, instructionsStart)
      .map((line) => parseIngredient(line))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    const title = humanizeTitle(sanitizeTitle(titlePart), ingredients);
    const instructions = parseInstructions(
      stripMarketingCopy(bodyLines.slice(instructionsStart).join("\n"))
    );

    if (!title || ingredients.length === 0 || instructions.length === 0) {
      continue;
    }

    const manualTags: string[] = [];
    if (inferResetTag(title, ingredients)) {
      manualTags.push("reset");
    }

    recipes.push({
      page: page.page,
      title,
      slug: slugify(title),
      category: currentCategory,
      ingredients,
      instructions,
      tags: normalizeRecipeTags({
        title,
        description: null,
        tags: manualTags,
        ingredients,
        carbs: null,
      }),
    });
  }

  return recipes;
}

async function main() {
  const pages = extractPagesFromPdf(PDF_PATH);
  const recipes = parseRecipes(pages);

  const existingTitles = new Set(
    (
      await prisma.recipe.findMany({
        select: {
          title: true,
          slug: true,
        },
      })
    ).flatMap((recipe) => [recipe.title.toLowerCase(), recipe.slug])
  );

  const toCreate = recipes.filter(
    (recipe) => !existingTitles.has(recipe.title.toLowerCase()) && !existingTitles.has(recipe.slug)
  );

  console.log(
    JSON.stringify(
      {
        totalPages: pages.length,
        parsedRecipes: recipes.length,
        toCreate: toCreate.length,
        sample: toCreate.slice(0, 10).map((recipe) => ({
          page: recipe.page,
          title: recipe.title,
          category: recipe.category,
          tags: recipe.tags,
        })),
      },
      null,
      2
    )
  );

  if (!APPLY_CHANGES) {
    return;
  }

  let created = 0;
  for (const recipe of toCreate) {
    await prisma.recipe.create({
      data: {
        title: recipe.title,
        slug: recipe.slug,
        description: null,
        imageUrl: null,
        category: recipe.category,
        tags: recipe.tags,
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
        servings: 2,
        prepTime: null,
        cookTime: null,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        isPublished: true,
      },
    });
    created += 1;
  }

  console.log(JSON.stringify({ created }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
