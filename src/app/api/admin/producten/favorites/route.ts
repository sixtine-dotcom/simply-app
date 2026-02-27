import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const createSchema = z.object({
  brand: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  discountCode: z.string().nullable().optional(),
  productUrl: z.string().url().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

/** GET: list favorites */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const favorites = await db.favoriteProduct.findMany({
      orderBy: { position: "asc" },
    });
    return NextResponse.json(favorites);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

/** POST: create favorite */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const body = await request.json();
    const data = createSchema.parse(body);
    const fav = await db.favoriteProduct.create({
      data: {
        brand: data.brand,
        name: data.name,
        description: data.description ?? null,
        discountCode: data.discountCode ?? null,
        productUrl: data.productUrl ?? null,
        position: data.position ?? 0,
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
