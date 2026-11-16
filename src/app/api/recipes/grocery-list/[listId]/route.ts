import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { groceryName } from "@/lib/grocery-list";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ listId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Log opnieuw in." }, { status: 401 });
    const name = groceryName.safeParse((await request.json()).name);
    if (!name.success) return NextResponse.json({ error: "Geef je lijst een naam van maximaal 100 tekens." }, { status: 400 });
    const { listId } = await params;
    const updated = await db.groceryList.updateMany({ where: { id: listId, userId: user.id }, data: { name: name.data } });
    if (!updated.count) return NextResponse.json({ error: "Lijst niet gevonden." }, { status: 404 });
    return NextResponse.json({ id: listId, name: name.data });
  } catch {
    return NextResponse.json({ error: "De naam kon niet worden opgeslagen. Probeer opnieuw." }, { status: 500 });
  }
}
