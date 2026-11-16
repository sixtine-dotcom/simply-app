import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserGroceryLists, generateGroceryList } from "@/lib/recipes";
import { z } from "zod";
import { groceryName } from "@/lib/grocery-list";

const createSchema = z.object({ name: groceryName.optional(), recipeIds: z.array(z.string().min(1).max(100)).max(100).default([]) }).strict();

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const lists = await getUserGroceryLists(user.id);

    return NextResponse.json(lists, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Get grocery lists error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Geef je lijst een naam van maximaal 100 tekens en kies geldige recepten." }, { status: 400 });
    const { recipeIds, name } = parsed.data;

    const list = await generateGroceryList(user.id, recipeIds, name);

    return NextResponse.json(list);
  } catch (error) {
    console.error("Create grocery list error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
