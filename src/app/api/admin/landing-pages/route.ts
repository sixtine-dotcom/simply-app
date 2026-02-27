import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog } from "@/lib/auth";

const blocksSchema = z.array(
  z.object({
    type: z.enum(["heading", "text", "image", "video", "product", "calendly", "cta"]),
    id: z.string().optional(),
    // heading
    level: z.number().optional(),
    text: z.string().optional(),
    // text
    content: z.string().optional(),
    // image
    url: z.string().optional(),
    alt: z.string().optional(),
    // video
    provider: z.enum(["vimeo", "loom"]).optional(),
    videoId: z.string().optional(),
    // product
    productHandle: z.string().optional(),
    // calendly
    embedUrl: z.string().optional(),
    // cta
    label: z.string().optional(),
    href: z.string().optional(),
    primary: z.boolean().optional(),
  })
);

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  headline: z.string().optional(),
  subheadline: z.string().optional(),
  shopifyStoreDomain: z.string().optional(),
  shopifyStorefrontToken: z.string().optional(),
  blocks: blocksSchema.optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const pages = await db.landingPage.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(pages);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const body = await request.json();
    const data = createSchema.parse(body);

    const existing = await db.landingPage.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return NextResponse.json({ error: "Deze slug is al in gebruik" }, { status: 400 });
    }

    const page = await db.landingPage.create({
      data: {
        title: data.title,
        slug: data.slug,
        headline: data.headline ?? null,
        subheadline: data.subheadline ?? null,
        shopifyStoreDomain: data.shopifyStoreDomain ?? null,
        shopifyStorefrontToken: data.shopifyStorefrontToken ?? null,
        blocks: (data.blocks ?? []) as object[],
      },
    });

    await createAuditLog("landing_page.created", user.id, { landingPageId: page.id });
    return NextResponse.json(page);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Aanmaken mislukt" }, { status: 500 });
  }
}
