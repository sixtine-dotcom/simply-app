import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { groceryItemFields } from "@/lib/grocery-list";

const patchSchema = groceryItemFields.partial().extend({ isChecked: z.boolean().optional() }).strict().refine(data => Object.keys(data).length > 0);
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log opnieuw in." }, { status: 401 });
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Controleer de productnaam, hoeveelheid en het vinkje." }, { status: 400 });
    const { id } = await params;
    const updated = await db.groceryItem.updateMany({ where: { id, groceryList: { userId: user.id } }, data: parsed.data });
    if (!updated.count) return NextResponse.json({ error: "Product niet gevonden." }, { status: 404 });
    return NextResponse.json({ id, ...parsed.data });
  } catch {
    return NextResponse.json({ error: "De wijziging kon niet worden opgeslagen. Probeer opnieuw." }, { status: 500 });
  }
}
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log opnieuw in." }, { status: 401 });
    const { id } = await params;
    const deleted = await db.groceryItem.deleteMany({ where: { id, groceryList: { userId: user.id } } });
    if (!deleted.count) return NextResponse.json({ error: "Product niet gevonden." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Het product kon niet worden verwijderd. Probeer opnieuw." }, { status: 500 });
  }
}
