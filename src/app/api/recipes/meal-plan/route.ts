import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getOrCreateMealPlan,
  addRecipeToMealPlan,
  addCustomMealPlanItem,
  autoGenerateMealPlanForWeek,
  createUserCustomRecipe,
  removeRecipeFromMealPlan,
  updateMealPlanSettings,
} from "@/lib/recipes";

function parseWeekStartInput(value: string) {
  const [year, month, day] = value.split("T")[0].split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 0, 0, 0, 0);
}

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

    const mealPlan = await getOrCreateMealPlan(user.id, parseWeekStartInput(weekStart));

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
    const { weekStart, recipeId, dayOfWeek, mealType, customEntry, saveToAccount, action } = body;

    if (action === "autogenerate") {
      if (!weekStart) {
        return NextResponse.json(
          { error: "weekStart is verplicht" },
          { status: 400 }
        );
      }

      const generatedMealPlan = await autoGenerateMealPlanForWeek(
        user.id,
        parseWeekStartInput(weekStart)
      );

      return NextResponse.json({ mealPlan: generatedMealPlan });
    }

    const normalizedDayOfWeek =
      typeof dayOfWeek === "number"
        ? dayOfWeek
        : typeof dayOfWeek === "string" && dayOfWeek.trim() !== ""
          ? Number(dayOfWeek)
          : null;
    const normalizedMealType =
      typeof mealType === "string" && mealType.trim() ? mealType.trim() : null;

    const today = new Date();
    const jsDay = today.getDay();
    const fallbackDayOfWeek = jsDay === 0 ? 6 : jsDay - 1;
    const fallbackMealType = "lunch";
    const resolvedDayOfWeek =
      normalizedDayOfWeek !== null && Number.isInteger(normalizedDayOfWeek)
        ? normalizedDayOfWeek
        : fallbackDayOfWeek;
    const resolvedMealType = normalizedMealType ?? fallbackMealType;

    if (!weekStart || (!recipeId && !customEntry)) {
      return NextResponse.json(
        { error: "weekStart en een recept of eigen invoer zijn verplicht" },
        { status: 400 }
      );
    }

    const mealPlan = await getOrCreateMealPlan(user.id, parseWeekStartInput(weekStart));
    let savedCustomRecipe = null;

    if (customEntry && saveToAccount) {
      savedCustomRecipe = await createUserCustomRecipe({
        userId: user.id,
        title: customEntry.title,
        description: customEntry.description,
        imageUrl: customEntry.imageUrl,
        calories: customEntry.calories,
        protein: customEntry.protein,
        carbs: customEntry.carbs,
        fat: customEntry.fat,
        fiber: customEntry.fiber,
        ingredients: customEntry.ingredients,
      });
    }

    const item = customEntry
      ? await addCustomMealPlanItem({
          mealPlanId: mealPlan.id,
          dayOfWeek: resolvedDayOfWeek,
          mealType: resolvedMealType,
          title: customEntry.title,
          description: customEntry.description,
          imageUrl: customEntry.imageUrl,
          calories: customEntry.calories,
          protein: customEntry.protein,
          carbs: customEntry.carbs,
          fat: customEntry.fat,
          fiber: customEntry.fiber,
          ingredients: customEntry.ingredients,
        })
      : await addRecipeToMealPlan(
          mealPlan.id,
          recipeId,
          resolvedDayOfWeek,
          resolvedMealType
        );

    return NextResponse.json({ item, savedCustomRecipe });
  } catch (error) {
    console.error("Add to meal plan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await request.json();
    const { weekStart, calorieCalculatorEnabled } = body;

    if (!weekStart || typeof calorieCalculatorEnabled !== "boolean") {
      return NextResponse.json(
        { error: "weekStart en calorieCalculatorEnabled zijn verplicht" },
        { status: 400 }
      );
    }

    const mealPlan = await getOrCreateMealPlan(user.id, parseWeekStartInput(weekStart));
    const updated = await updateMealPlanSettings(mealPlan.id, {
      calorieCalculatorEnabled,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update meal plan settings error:", error);
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
