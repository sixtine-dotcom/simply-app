import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const createSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  position: z.number().int().min(0).optional(),
});

/** GET: list categories with items */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const categories = await db.knowledgeCategory.findMany({
      orderBy: { position: "asc" },
      include: { items: { orderBy: { position: "asc" } } },
    });
    return NextResponse.json(categories);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

/** POST: create category */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const body = await request.json();
    const data = createSchema.parse(body);
    const slug = data.slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const existing = await db.knowledgeCategory.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "Slug bestaat al" }, { status: 400 });
    }
    const category = await db.knowledgeCategory.create({
      data: {
        slug: slug || data.slug,
        title: data.title,
        position: data.position ?? 0,
      },
    });
    return NextResponse.json(category);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
