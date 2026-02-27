import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateMealPlan, addRecipeToMealPlan, removeRecipeFromMealPlan } from "@/lib/recipes";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get("weekStart");

    if (!weekStart) {
      return NextResponse.json(
        { error: "weekStart is verplicht" },
        { status: 400 }
      );
    }

    const mealPlan = await getOrCreateMealPlan(user.id, new Date(weekStart));

    return NextResponse.json(mealPlan);
  } catch (error) {
    console.error("Get meal plan error:", error);
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
    const { weekStart, recipeId, dayOfWeek, mealType } = body;

    if (!weekStart || !recipeId || dayOfWeek === undefined || !mealType) {
      return NextResponse.json(
        { error: "weekStart, recipeId, dayOfWeek en mealType zijn verplicht" },
        { status: 400 }
      );
    }

    const mealPlan = await getOrCreateMealPlan(user.id, new Date(weekStart));
    const item = await addRecipeToMealPlan(
      mealPlan.id,
      recipeId,
      dayOfWeek,
      mealType
    );

    return NextResponse.json(item);
  } catch (error) {
    console.error("Add to meal plan error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId is verplicht" },
        { status: 400 }
      );
    }

    await removeRecipeFromMealPlan(itemId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove from meal plan error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
