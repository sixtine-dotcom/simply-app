import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { groceryItemFields } from "@/lib/grocery-list";

export async function POST(request: NextRequest, { params }: { params: Promise<{ listId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log opnieuw in." }, { status: 401 });
    const parsed = groceryItemFields.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Vul een productnaam in van maximaal 150 tekens. Houd de hoeveelheid kort." }, { status: 400 });
    const { listId } = await params;
    const item = await db.$transaction(async tx => {
      const list = await tx.groceryList.findFirst({ where: { id: listId, userId: user.id }, select: { id: true } });
      if (!list) return null;
      return tx.groceryItem.create({ data: { groceryListId: list.id, ...parsed.data } });
    });
    if (!item) return NextResponse.json({ error: "Lijst niet gevonden." }, { status: 404 });
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Het product kon niet worden opgeslagen. Probeer opnieuw." }, { status: 500 });
  }
}
