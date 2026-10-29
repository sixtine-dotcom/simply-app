import { readFile } from "fs/promises";
import path from "path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { DEFAULT_THEME, type CarouselSlide, type CarouselTheme } from "@/lib/carousel-shared";
import { db } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import { SLIDE_HEIGHT, SLIDE_WIDTH, getTemplate } from "./templates";

// Draws carousel slides in the app (Satori via next/og, then sharp to JPEG for Instagram): seconds, no Canva.
// Fonts ship with the app (SIL Open Font License, see fonts/LICENSE-*.txt); next.config.js traces them into the build.

const FONT_DIR = path.join(process.cwd(), "src/lib/carousel-render/fonts");

type FontSpec = { name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: "normal" | "italic" };
let fontsPromise: Promise<FontSpec[]> | null = null;

function loadFonts() {
  fontsPromise ??= Promise.all(
    (
      [
        ["Playfair Display", "playfair-display-latin-400-normal.woff", 400, "normal"],
        ["Playfair Display", "playfair-display-latin-400-italic.woff", 400, "italic"],
        ["Playfair Display", "playfair-display-latin-700-normal.woff", 700, "normal"],
        ["Montserrat", "montserrat-latin-400-normal.woff", 400, "normal"],
        ["Montserrat", "montserrat-latin-600-normal.woff", 600, "normal"],
        ["Montserrat", "montserrat-latin-700-normal.woff", 700, "normal"],
      ] as const
    ).map(async ([name, file, weight, style]) => {
      const buffer = await readFile(path.join(FONT_DIR, file));
      return { name, weight, style, data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer };
    }),
  ).catch((error) => {
    fontsPromise = null;
    throw error;
  });
  return fontsPromise;
}

export type RenderInput = {
  slides: CarouselSlide[];
  theme: CarouselTheme;
  templateId?: string | null;
  photoUrl: string | null;
  label: string;
  handle: string;
};

/** What to draw for a carousel: its slides and photo, with the look from the Carousel Studio settings. */
export async function renderInputForCarousel(
  carousel: { tenantId: string | null; slides: unknown; photoUrl: string | null },
  templateId?: string | null,
): Promise<RenderInput> {
  const settings = await db.carouselSettings.findFirst({ where: { tenantId: carousel.tenantId }, select: { theme: true } });
  const theme: CarouselTheme = { ...DEFAULT_THEME, ...((settings?.theme as Partial<CarouselTheme> | null) ?? {}) };
  return {
    slides: (Array.isArray(carousel.slides) ? carousel.slides : []) as CarouselSlide[],
    theme,
    templateId: templateId || theme.template,
    photoUrl: carousel.photoUrl,
    label: theme.label || DEFAULT_THEME.label || "",
    handle: theme.handle || DEFAULT_THEME.handle || "",
  };
}

/** One slide as PNG. */
export async function renderSlidePng(input: RenderInput, index: number) {
  const template = getTemplate(input.templateId);
  const slide = input.slides[index];
  if (!slide) throw new Error(`Slide ${index + 1} bestaat niet`);
  const element = template.render({
    slide,
    index,
    total: input.slides.length,
    theme: input.theme,
    photoUrl: template.usesPhoto || slide.type === "hook" ? input.photoUrl : null,
    label: input.label,
    handle: input.handle,
  });
  const response = new ImageResponse(<>{element}</>, { width: SLIDE_WIDTH, height: SLIDE_HEIGHT, fonts: await loadFonts() });
  return Buffer.from(await response.arrayBuffer());
}

/** All slides as JPEGs in R2 (Instagram carousels only take JPEG). Returns the public URLs, in order. */
export async function renderCarouselToR2(input: RenderInput, keyPrefix: string) {
  const urls: string[] = [];
  const stamp = Date.now();
  for (let i = 0; i < input.slides.length; i++) {
    const png = await renderSlidePng(input, i);
    const jpeg = await sharp(png).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
    const { url } = await uploadToR2({ key: `${keyPrefix}/${stamp}-slide-${String(i + 1).padStart(2, "0")}.jpg`, body: jpeg, contentType: "image/jpeg" });
    urls.push(url);
  }
  return urls;
}
