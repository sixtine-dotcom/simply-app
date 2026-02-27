import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const createSchema = z.object({
  title: z.string().min(1),
  videoUrl: z.string().url().nullable().optional(),
  videoProvider: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

/** GET: list items for category */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const { id: categoryId } = await params;
    const items = await db.knowledgeItem.findMany({
      where: { categoryId },
      orderBy: { position: "asc" },
    });
    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

/** POST: create item */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const { id: categoryId } = await params;
    const body = await request.json();
    const data = createSchema.parse(body);
    const item = await db.knowledgeItem.create({
      data: {
        categoryId,
        title: data.title,
        videoUrl: data.videoUrl ?? null,
        videoProvider: data.videoProvider ?? null,
        description: data.description ?? null,
        position: data.position ?? 0,
      },
    });
    return NextResponse.json(item);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
