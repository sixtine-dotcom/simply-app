import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const updateSchema = z.object({
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  position: z.number().int().min(0).optional(),
});

/** PATCH: update category */
export async function PATCH(
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
    const update: { slug?: string; title?: string; position?: number } = {};
    if (data.slug !== undefined) {
      const slug = data.slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const existing = await db.knowledgeCategory.findFirst({
        where: { slug, id: { not: id } },
      });
      if (existing) return NextResponse.json({ error: "Slug bestaat al" }, { status: 400 });
      update.slug = slug || data.slug;
    }
    if (data.title !== undefined) update.title = data.title;
    if (data.position !== undefined) update.position = data.position;
    const category = await db.knowledgeCategory.update({
      where: { id },
      data: update,
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

/** DELETE: delete category */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const { id } = await params;
    await db.knowledgeCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
