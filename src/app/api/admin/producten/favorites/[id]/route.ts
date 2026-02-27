import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const updateSchema = z.object({
  brand: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  discountCode: z.string().nullable().optional(),
  productUrl: z.string().url().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

/** PATCH: update favorite */
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
    const fav = await db.favoriteProduct.update({
      where: { id },
      data: {
        ...(data.brand && { brand: data.brand }),
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.discountCode !== undefined && { discountCode: data.discountCode }),
        ...(data.productUrl !== undefined && { productUrl: data.productUrl }),
        ...(data.position !== undefined && { position: data.position }),
      },
    });
    return NextResponse.json(fav);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

/** DELETE: delete favorite */
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
    await db.favoriteProduct.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
