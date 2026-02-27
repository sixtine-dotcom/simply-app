import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getUserGroceryLists } from "@/lib/recipes";
import { db } from "@/lib/db";

const addRecipeSchema = z.object({
  recipeId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await request.json();
    const data = addRecipeSchema.parse(body);

    // Get or create active grocery list
    let activeList = await db.groceryList.findFirst({
      where: {
        userId: user.id,
        name: "Boodschappenlijst",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!activeList) {
      activeList = await db.groceryList.create({
        data: {
          userId: user.id,
          name: "Boodschappenlijst",
        },
      });
    }

    // Get recipe ingredients
    const recipe = await db.recipe.findUnique({
      where: { id: data.recipeId },
    });

    if (!recipe) {
      return NextResponse.json(
        { error: "Recept niet gevonden" },
        { status: 404 }
      );
    }

    const ingredients = recipe.ingredients as any[];

    // Add ingredients to list (check for duplicates)
    for (const ing of ingredients) {
      const existing = await db.groceryItem.findFirst({
        where: {
          groceryListId: activeList.id,
          ingredient: ing.ingredient,
        },
      });

      if (!existing) {
        await db.groceryItem.create({
          data: {
            groceryListId: activeList.id,
            recipeId: data.recipeId,
            ingredient: ing.ingredient,
            amount: ing.amount || null,
            unit: ing.unit || null,
          },
        });
      }
    }

    return NextResponse.json({ success: true, listId: activeList.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Add to grocery list error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
