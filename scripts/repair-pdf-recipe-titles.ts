import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PDF_PATH = process.argv[2];

if (!PDF_PATH) {
  console.error("Gebruik: tsx scripts/repair-pdf-recipe-titles.ts \"/pad/naar/bestand.pdf\"");
  process.exit(1);
}

type ExtractedPage = { page: number; text: string };

function extractPagesFromPdf(pdfPath: string): ExtractedPage[] {
  const swiftScript = `
import Foundation
import PDFKit
struct PagePayload: Codable { let page: Int; let text: String }
let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let doc = PDFDocument(url: url) else { exit(1) }
let encoder = JSONEncoder()
encoder.outputFormatting = [.sortedKeys]
var payload: [PagePayload] = []
for index in 0..<doc.pageCount { payload.append(PagePayload(page: index + 1, text: doc.page(at: index)?.string ?? "")) }
FileHandle.standardOutput.write(try encoder.encode(payload))
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
  "aziatische","salade","boontjes","vegetarisch","gehakt","baby","romeinse","sla","bloemkool","puree",
  "boekweit","pasta","ricotta","courgetti","groene","pesto","kerstomaatjes","oven","broccoli","brood",
  "coeur","boeuf","avocado","spiegelei","frisse","frissesalade","kippenreepjes","hardgekookt","eitje",
  "granaatappel","edamame","wortelslierten","koolraap","tagliatelle","truffelsaus","kalkoenspekjes",
  "surimisalade","aubergine","fleur","sel","cashews","spruitjes","wilde","rijst","witte","kool",
  "currysaus","broccolirijst","groentenmix","taco","tacos","knolselder","pastinaak","garnalen","gepocheerd",
  "koolsalade","lasagne","bechamelsaus","overnight","oats","peulvruchten","ovenschotel","pizza","poke",
  "bowl","quinoa","ratatouille","ravioli","rijstsalade","scampi","gember","dressing","simpel","slaatje",
  "asperges","zeekraal","worteltjes","mexicaanse","gevulde","pompoen","soep","wokgroenten","tofu","vegan",
  "feta","muhammara","ceviche","zeebaars","golden","milk","dalgona","healthy","salted","caramel","sweets",
  "komkommer","spread","pecan","surimi","spring","rolls","courgette","kip","zalm","tonijnsteak","zoete",
  "aardappel","frietjes","groentjes","bloemkoolrijst","nasi","goreng","met","en","op","basis","van","zonder",
  "koolhydraatarm","koolhydraatarme","speculaas","havermout","koekjes","wortel","zaden","crackers","mugcake",
  "appel","crumble","bananen","milkshake","greek","style","yoghurt","eiwitpoeder","gebakken","appeltjes",
  "speculaaskruiden","granola","frozen","smoothie","gezonde","wafels","notenbrood","kokosbrood",
  "pompoenkoekjes","walnoot","chai","chia","geroosterde","pudding","pannenkoeken","baked","pumpkin",
  "oatmeal","farci","springrolls","tzatziki","salad","salade","romeinse","spinazie","burger","burger",
];

const TITLE_OVERRIDES: Record<string, string> = {
  "broccolibroodmetcoeurdeboef-spitskool-avocadoeneenspiegelei":
    "Broccolibrood met coeur de boeuf, spitskool, avocado en een spiegelei",
  "carpacciovancoeurdegebakkenzalmenfeta-1-persoonboeufmet":
    "Carpaccio van coeur de boeuf met gebakken zalm en feta",
  "coeurdeboefmozzarellametvijgenenamandelschilfers":
    "Coeur de boeuf met mozzarella, vijgen en amandelschilfers",
  "courgette-wortel-pastinaakro-stiiii":
    "Courgette-, wortel- en pastinaakrosti",
  "courgetti-1-persoonmetkippenreepjes":
    "Courgetti met kippenreepjes",
  "gebakkenslaatjesmetsurimisalade":
    "Gebakken slaatjes met surimisalade",
  "gegrildeauberginemetveganfeta-basilicum-amandelschilfersenfleurdesel":
    "Gegrilde aubergine met vegan feta, basilicum, amandelschilfers en fleur de sel",
  "gegrildepompoenmetgeroosterdecashewsveganfetakorianderen":
    "Gegrilde pompoen met geroosterde cashews, vegan feta en koriander",
  "gevuldecourgettemetkerstomaatjesindeoven":
    "Gevulde courgette met kerstomaatjes uit de oven",
  "knolselder-pastinaakpureemetgrijzegarnaleneneengepocheerdeitje":
    "Knolselder-pastinaakpuree met grijze garnalen en een gepocheerd eitje",
  "komkommerschijfjesmetnotenveganspreadenpecan":
    "Komkommerschijfjes met vegan spread en pecan",
  "koolhydraatarme-notenvrijegranola":
    "Koolhydraatarme notenvrije granola",
  "pittigeovenschotelmetpompoenenkippengehakt":
    "Pittige ovenschotel met pompoen en kippengehakt",
  "quinoasalademetgegrildetofueneengember-citroen-dressing-4-personen":
    "Quinoasalade met gegrilde tofu en een gember-citroendressing",
  "quinoasalademetpompoen-kerstomaat-babyspinazie-zwarte-olijven-noten-4-personen":
    "Quinoasalade met pompoen, kerstomaat, babyspinazie, zwarte olijven en noten",
  "rijstnoodles-2-personenmetgebakkengroentenentofu":
    "Rijstnoodles met gebakken groenten en tofu",
  "salademetsurimieneenspiegeleitje":
    "Salade met surimi en een spiegeleitje",
  "spinazie-omeletmetgeroosterdekikkererwten":
    "Spinazie-omelet met geroosterde kikkererwten",
  "tatakivantonijnmetwokgroenten":
    "Tataki van tonijn met wokgroenten",
  "tomaten-courgetticurrymetpompoenblokjes-kipen":
    "Tomaten-courgettecurry met pompoenblokjes en kip",
  "torentjevancourgettemetgebakkenkip-2-personen":
    "Torentje van courgette met gebakken kip",
  "torentjevankrabmetwarmegroentjes":
    "Torentje van krab met warme groentjes",
  "vegetarischepastametcourgetteentruffelolie-4-personen":
    "Vegetarische pasta met courgette en truffelolie",
  "wintersslaatjesmetgegrildespruitjesenwarmefeta":
    "Winters slaatje met gegrilde spruitjes en warme feta",
  "witteaspergesmeteenhardgekookteitjeengerooktezalm-2-personen":
    "Witte asperges met een hardgekookt eitje en gerookte zalm",
  "wittevisgepaneerdinkokosmeelmetpittigegroentjes":
    "Witte vis gepaneerd in kokosmeel met pittige groentjes",
  "wraps-4-personenmetpompoenenkippengehakt":
    "Wraps met pompoen en kippengehakt",
  "zalmmetgroenegroenten-2-personen":
    "Zalm met groene groenten",
  "zalmmetkokosengroenten-2-personen":
    "Zalm met kokos en groenten",
  "zalmteriyakimetgroeneaspergesenbloemkoolrijst":
    "Zalm teriyaki met groene asperges en bloemkoolrijst",
};

function normalizeWord(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
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

function parseIngredient(line: string) {
  const cleaned = line.replace(/^[*•✅\-]+/g, "").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  const match = cleaned.match(
    /^((?:\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+|een|één|halve?|half|snuifje|optioneel|ca\.)\s*(?:[A-Za-zÀ-ÿ.%]+)?)(?:\s+)(.+)$/i
  );
  if (!match) return { ingredient: cleaned };
  const amountPart = match[1].trim();
  const rest = match[2].trim();
  const amountTokens = amountPart.split(/\s+/);
  if (amountTokens.length >= 2) {
    return { amount: amountTokens[0], unit: amountTokens.slice(1).join(" "), ingredient: rest };
  }
  return { amount: amountPart, ingredient: rest };
}

function buildTitleLexicon(ingredients: { ingredient: string; amount?: string; unit?: string }[]) {
  const lexicon = new Set(TITLE_HINT_WORDS.map(normalizeWord).filter(Boolean));
  for (const ingredient of ingredients) {
    for (const part of ingredient.ingredient.split(/\s+/)) {
      const normalized = normalizeWord(part);
      if (normalized.length >= 3) lexicon.add(normalized);
    }
  }
  return lexicon;
}

function segmentCompactChunk(chunk: string, lexicon: Set<string>): string[] {
  const lowerChunk = normalizeWord(chunk);
  if (!lowerChunk || lexicon.has(lowerChunk)) return [chunk];
  const n = lowerChunk.length;
  const bestScore = Array<number>(n + 1).fill(Number.NEGATIVE_INFINITY);
  const bestParts: string[][] = Array.from({ length: n + 1 }, () => []);
  bestScore[0] = 0;
  for (let i = 0; i < n; i += 1) {
    if (!Number.isFinite(bestScore[i])) continue;
    for (let j = i + 2; j <= Math.min(n, i + 24); j += 1) {
      const piece = lowerChunk.slice(i, j);
      if (!lexicon.has(piece)) continue;
      const score = bestScore[i] + piece.length * piece.length;
      if (score > bestScore[j]) {
        bestScore[j] = score;
        bestParts[j] = [...bestParts[i], piece];
      }
    }
  }
  if (!Number.isFinite(bestScore[n]) || bestParts[n].length <= 1) return [chunk];
  return bestParts[n];
}

function humanizeTitle(title: string, ingredients: { ingredient: string; amount?: string; unit?: string }[]) {
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
    output.push(segmentCompactChunk(token, lexicon).join(" "));
  }

  return output
    .join(" ")
    .replace(/\s+,/g, ",")
    .replace(/\s+([/\\-])/g, " $1")
    .replace(/([/\\-])\s+/g, "$1 ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function findInstructionsStartIndex(lines: string[]) {
  const starters = [
    "verwarm","verwijder","breek","plet","voeg","maak","bak","giet","meng","snij","kook","klop","vet","doe","zet",
    "laat","werk","mix","besprenkel","haal","leg","serveer","plaats","verdeel","breng","roer","spoel","kruid",
    "rooster","smeer","was","pel","gebruik",
  ];

  return lines.findIndex((line) => {
    const cleaned = line.replace(/^[*•✅\-]+/g, "").trim().toLowerCase();
    return starters.some((starter) => cleaned.startsWith(starter));
  });
}

async function main() {
  extractPagesFromPdf(PDF_PATH);

  const recipes = await prisma.recipe.findMany({
    where: {
      imageUrl: { startsWith: "/uploads/pdf-recipes/" },
    },
    select: { id: true, slug: true, title: true, ingredients: true },
  });

  let updated = 0;
  const changed: Array<{ from: string; to: string }> = [];

  for (const recipe of recipes) {
    const overrideTitle = TITLE_OVERRIDES[recipe.slug];
    const ingredients = (recipe.ingredients as Array<{ ingredient: string; amount?: string; unit?: string }>) ?? [];
    const nextTitle = overrideTitle
      ?? humanizeTitle(
        recipe.slug
          .replace(/-/g, " ")
          .replace(/\bpp\b/gi, "pp")
          .replace(/\bmet\b/gi, "met")
          .replace(/\ben\b/gi, "en"),
        ingredients
      );

    if (!nextTitle || nextTitle === recipe.title) continue;
    await prisma.recipe.update({
      where: { id: recipe.id },
      data: { title: nextTitle },
    });
    updated += 1;
    changed.push({ from: recipe.title, to: nextTitle });
  }

  console.log(JSON.stringify({ updated, changed: changed.slice(0, 50) }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
