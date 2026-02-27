import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserGroceryLists, generateGroceryList } from "@/lib/recipes";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const lists = await getUserGroceryLists(user.id);

    return NextResponse.json(lists);
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

    const body = await request.json();
    const { recipeIds, name } = body;

    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return NextResponse.json(
        { error: "Recept IDs zijn verplicht" },
        { status: 400 }
      );
    }

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
