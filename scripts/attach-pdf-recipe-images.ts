import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PDF_PATH = process.argv[2];

if (!PDF_PATH) {
  console.error("Gebruik: tsx scripts/attach-pdf-recipe-images.ts \"/pad/naar/bestand.pdf\"");
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

function parseIngredient(line: string) {
  const cleaned = line
    .replace(/^[*•✅\-]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

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

const TITLE_HINT_WORDS = [
  "met", "en", "op", "basis", "van", "zonder", "koolhydraatarm", "koolhydraatarme", "speculaas",
  "havermout", "koekjes", "wortel", "zaden", "crackers", "mugcake", "appel", "crumble", "bananen",
  "milkshake", "greek", "style", "yoghurt", "eiwitpoeder", "gebakken", "appeltjes", "speculaaskruiden",
  "granola", "frozen", "smoothie", "gezonde", "pompoen", "wafels", "notenbrood", "kokosbrood",
  "pompoenkoekjes", "walnoot", "chai", "overnight", "chia", "geroosterde", "pudding", "pannenkoeken",
  "baked", "pumpkin", "oatmeal", "farci", "springrolls", "tzatziki",
];

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
    output.push(segmentCompactChunk(token, lexicon).join(" "));
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

function findInstructionsStartIndex(lines: string[]): number {
  const starters = [
    "verwarm", "verwijder", "breek", "plet", "voeg", "maak", "bak", "giet", "meng", "snij",
    "kook", "klop", "vet", "doe", "zet", "laat", "werk", "mix", "besprenkel", "haal", "leg",
    "serveer", "plaats", "verdeel", "breng", "roer", "spoel", "kruid", "rooster", "smeer", "was", "pel", "gebruik",
  ];

  return lines.findIndex((line) => {
    const cleaned = line.replace(/^[*•✅\-]+/g, "").trim().toLowerCase();
    return starters.some((starter) => cleaned.startsWith(starter));
  });
}

function isCategoryPage(text: string): boolean {
  const compact = text.replace(/\s+/g, " ").trim().toUpperCase();
  return ["ONTBIJT", "LUNCH", "DINER", "AVONDMAAL", "SNACK", "SNACKS", "DESSERT", "TUSSENDOOR"].includes(compact);
}

function parseRecipes(pages: ExtractedPage[]): ParsedRecipe[] {
  const recipes: ParsedRecipe[] = [];

  for (const page of pages) {
    const normalized = normalizeText(page.text);
    if (!normalized || isCategoryPage(normalized)) continue;
    if (!normalized.includes("INGREDIËNTEN") || !normalized.includes("BEREIDING")) continue;

    const ingredientsIndex = normalized.indexOf("INGREDIËNTEN");
    const titlePart = normalized.slice(0, ingredientsIndex);
    const body = normalized
      .slice(ingredientsIndex)
      .replace(/INGREDIËNTEN\s*:\s*/g, "")
      .replace(/BEREIDING\s*:\s*/g, "")
      .trim();

    const bodyLines = body.split("\n").map((line) => line.trim()).filter(Boolean);
    const instructionsStart = findInstructionsStartIndex(bodyLines);
    if (instructionsStart <= 0) continue;

    const ingredients = bodyLines
      .slice(0, instructionsStart)
      .map((line) => parseIngredient(line))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const title = humanizeTitle(sanitizeTitle(titlePart), ingredients);
    recipes.push({
      page: page.page,
      title,
      slug: slugify(title),
    });
  }

  return recipes;
}

async function main() {
  const pages = extractPagesFromPdf(PDF_PATH);
  const parsed = parseRecipes(pages);
  const matches = await prisma.recipe.findMany({
    where: {
      slug: {
        in: parsed.map((recipe) => recipe.slug),
      },
    },
    select: {
      id: true,
      slug: true,
    },
  });

  const matchMap = new Map(matches.map((recipe) => [recipe.slug, recipe]));
  const manifest = parsed
    .filter((recipe) => matchMap.has(recipe.slug))
    .map((recipe) => ({
      page: recipe.page,
      slug: recipe.slug,
      outPath: path.join(process.cwd(), "public", "uploads", "pdf-recipes", `${recipe.slug}.png`),
      url: `/uploads/pdf-recipes/${recipe.slug}.png`,
      recipeId: matchMap.get(recipe.slug)!.id,
    }));

  mkdirSync(path.join(process.cwd(), "public", "uploads", "pdf-recipes"), { recursive: true });
  const manifestPath = path.join(process.cwd(), ".tmp-pdf-image-manifest.json");
  writeFileSync(manifestPath, JSON.stringify({ pdfPath: PDF_PATH, items: manifest }, null, 2));

  const swiftScript = `
import Foundation
import PDFKit
import AppKit

struct Manifest: Decodable {
  let pdfPath: String
  let items: [Item]
}

struct Item: Decodable {
  let page: Int
  let outPath: String
}

let manifestURL = URL(fileURLWithPath: CommandLine.arguments[1])
let manifest = try JSONDecoder().decode(Manifest.self, from: Data(contentsOf: manifestURL))
let pdf = PDFDocument(url: URL(fileURLWithPath: manifest.pdfPath))!

func trimmedBounds(for image: CGImage) -> CGRect {
  let width = image.width
  let height = image.height
  guard let provider = image.dataProvider, let data = provider.data else {
    return CGRect(x: 0, y: 0, width: width, height: height)
  }

  let bytes = CFDataGetBytePtr(data)!
  let bytesPerRow = image.bytesPerRow
  let bytesPerPixel = image.bitsPerPixel / 8

  var minX = width
  var minY = height
  var maxX = -1
  var maxY = -1

  for y in 0..<height {
    for x in 0..<width {
      let offset = y * bytesPerRow + x * bytesPerPixel
      let r = Int(bytes[offset])
      let g = Int(bytes[offset + 1])
      let b = Int(bytes[offset + 2])

      if r < 245 || g < 245 || b < 245 {
        minX = min(minX, x)
        minY = min(minY, y)
        maxX = max(maxX, x)
        maxY = max(maxY, y)
      }
    }
  }

  if maxX < minX || maxY < minY {
    return CGRect(x: 0, y: 0, width: width, height: height)
  }

  let padding = 8
  return CGRect(
    x: max(0, minX - padding),
    y: max(0, minY - padding),
    width: min(width - max(0, minX - padding), maxX - minX + 1 + (padding * 2)),
    height: min(height - max(0, minY - padding), maxY - minY + 1 + (padding * 2))
  )
}

func detectPhotoBounds(in image: CGImage) -> CGRect {
  let width = image.width
  let height = image.height

  guard let provider = image.dataProvider, let data = provider.data else {
    return CGRect(x: 0, y: 0, width: width, height: height)
  }

  let bytes = CFDataGetBytePtr(data)!
  let bytesPerRow = image.bytesPerRow
  let bytesPerPixel = image.bitsPerPixel / 8

  let roiX = Int(Double(width) * 0.03)
  let roiY = Int(Double(height) * 0.10)
  let roiWidth = Int(Double(width) * 0.46)
  let roiHeight = Int(Double(height) * 0.42)

  var rowHits = Array(repeating: 0, count: roiHeight)
  var colHits = Array(repeating: 0, count: roiWidth)

  for y in 0..<roiHeight {
    for x in 0..<roiWidth {
      let px = roiX + x
      let py = roiY + y
      let offset = py * bytesPerRow + px * bytesPerPixel
      let r = Int(bytes[offset])
      let g = Int(bytes[offset + 1])
      let b = Int(bytes[offset + 2])

      if r < 245 || g < 245 || b < 245 {
        rowHits[y] += 1
        colHits[x] += 1
      }
    }
  }

  let rowThreshold = max(8, Int(Double(roiWidth) * 0.18))
  let colThreshold = max(8, Int(Double(roiHeight) * 0.18))

  func longestRun(values: [Int], threshold: Int) -> (start: Int, end: Int)? {
    var bestStart = -1
    var bestEnd = -1
    var currentStart = -1

    for index in 0..<values.count {
      if values[index] >= threshold {
        if currentStart == -1 {
          currentStart = index
        }
      } else if currentStart != -1 {
        if bestStart == -1 || (index - 1 - currentStart) > (bestEnd - bestStart) {
          bestStart = currentStart
          bestEnd = index - 1
        }
        currentStart = -1
      }
    }

    if currentStart != -1 {
      let currentEnd = values.count - 1
      if bestStart == -1 || (currentEnd - currentStart) > (bestEnd - bestStart) {
        bestStart = currentStart
        bestEnd = currentEnd
      }
    }

    if bestStart == -1 || bestEnd == -1 {
      return nil
    }

    return (bestStart, bestEnd)
  }

  let rowRun = longestRun(values: rowHits, threshold: rowThreshold)
  let colRun = longestRun(values: colHits, threshold: colThreshold)

  guard let rowRun, let colRun else {
    return CGRect(
      x: CGFloat(width) * 0.03,
      y: CGFloat(height) * 0.10,
      width: CGFloat(width) * 0.46,
      height: CGFloat(height) * 0.34
    ).integral
  }

  let padding = 16
  let x = max(0, roiX + rowRun.start * 0 + colRun.start - padding)
  let y = max(0, roiY + rowRun.start - padding)
  let w = min(width - x, colRun.end - colRun.start + 1 + (padding * 2))
  let h = min(height - y, rowRun.end - rowRun.start + 1 + (padding * 2))

  return CGRect(x: x, y: y, width: w, height: h).integral
}

for item in manifest.items {
  guard let page = pdf.page(at: item.page - 1) else { continue }
  let bounds = page.bounds(for: .mediaBox)
  let scale: CGFloat = 2
  let size = NSSize(width: bounds.width * scale, height: bounds.height * scale)
  let image = NSImage(size: size)
  image.lockFocus()
  NSColor.white.set()
  NSRect(origin: .zero, size: size).fill()
  let ctx = NSGraphicsContext.current!.cgContext
  ctx.scaleBy(x: scale, y: scale)
  page.draw(with: .mediaBox, to: ctx)
  image.unlockFocus()

  let fullRep = NSBitmapImageRep(data: image.tiffRepresentation!)!
  let fullImage = fullRep.cgImage!
  let cropRect = detectPhotoBounds(in: fullImage)

  let cropped = fullImage.cropping(to: cropRect) ?? fullImage
  let trimmedRect = trimmedBounds(for: cropped).integral
  let provisionalImage = cropped.cropping(to: trimmedRect) ?? cropped
  let cleanupRect = CGRect(
    x: 0,
    y: 0,
    width: provisionalImage.width,
    height: Int(Double(provisionalImage.height) * 0.70)
  ).integral
  let finalImage = provisionalImage.cropping(to: cleanupRect) ?? provisionalImage

  let rep = NSBitmapImageRep(cgImage: finalImage)
  let png = rep.representation(using: .png, properties: [:])!
  try png.write(to: URL(fileURLWithPath: item.outPath))
}

print(manifest.items.count)
`;

  execFileSync("swift", ["-e", swiftScript, manifestPath], {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });

  for (const item of manifest) {
    await prisma.recipe.update({
      where: { id: item.recipeId },
      data: { imageUrl: item.url },
    });
  }

  console.log(JSON.stringify({ attached: manifest.length }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
