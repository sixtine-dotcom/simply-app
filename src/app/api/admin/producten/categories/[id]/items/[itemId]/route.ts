import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  videoUrl: z.string().url().nullable().optional(),
  videoProvider: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

/** PATCH: update item */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const { itemId } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);
    const item = await db.knowledgeItem.update({
      where: { id: itemId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl }),
        ...(data.videoProvider !== undefined && { videoProvider: data.videoProvider }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.position !== undefined && { position: data.position }),
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

/** DELETE: delete item */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const { itemId } = await params;
    await db.knowledgeItem.delete({ where: { id: itemId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
