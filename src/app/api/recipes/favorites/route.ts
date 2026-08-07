import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getFavoriteRecipes, toggleFavoriteRecipe } from "@/lib/recipes";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const favorites = await getFavoriteRecipes(user.id);
    return NextResponse.json(favorites);
  } catch (error) {
    console.error("Get favorite recipes error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await request.json();
    const { recipeId, customRecipeId } = body;

    const result = await toggleFavoriteRecipe({
      userId: user.id,
      recipeId: recipeId ?? null,
      customRecipeId: customRecipeId ?? null,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Toggle favorite recipe error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
