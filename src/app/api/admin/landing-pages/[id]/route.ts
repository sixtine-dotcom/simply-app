import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog } from "@/lib/auth";

const blocksSchema = z.array(
  z.object({
    type: z.enum(["heading", "text", "image", "video", "product", "calendly", "cta"]),
    id: z.string().optional(),
    level: z.number().optional(),
    text: z.string().optional(),
    content: z.string().optional(),
    url: z.string().optional(),
    alt: z.string().optional(),
    provider: z.enum(["vimeo", "loom"]).optional(),
    videoId: z.string().optional(),
    productHandle: z.string().optional(),
    embedUrl: z.string().optional(),
    label: z.string().optional(),
    href: z.string().optional(),
    primary: z.boolean().optional(),
  })
);

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  headline: z.string().nullable().optional(),
  subheadline: z.string().nullable().optional(),
  isPublished: z.boolean().optional(),
  shopifyStoreDomain: z.string().nullable().optional(),
  shopifyStorefrontToken: z.string().nullable().optional(),
  blocks: blocksSchema.optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const { id } = await params;
    const page = await db.landingPage.findUnique({ where: { id } });
    if (!page) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    return NextResponse.json(page);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);

    if (data.slug) {
      const existing = await db.landingPage.findFirst({
        where: { slug: data.slug, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json({ error: "Deze slug is al in gebruik" }, { status: 400 });
      }
    }

    const page = await db.landingPage.update({
      where: { id },
      data: {
        ...(data.title != null && { title: data.title }),
        ...(data.slug != null && { slug: data.slug }),
        ...(data.headline !== undefined && { headline: data.headline }),
        ...(data.subheadline !== undefined && { subheadline: data.subheadline }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
        ...(data.shopifyStoreDomain !== undefined && { shopifyStoreDomain: data.shopifyStoreDomain }),
        ...(data.shopifyStorefrontToken !== undefined && { shopifyStorefrontToken: data.shopifyStorefrontToken }),
        ...(data.blocks !== undefined && { blocks: data.blocks as object[] }),
      },
    });

    await createAuditLog("landing_page.updated", user.id, { landingPageId: page.id });
    return NextResponse.json(page);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const { id } = await params;
    await db.landingPage.delete({ where: { id } });
    await createAuditLog("landing_page.deleted", user.id, { landingPageId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
  }
}
