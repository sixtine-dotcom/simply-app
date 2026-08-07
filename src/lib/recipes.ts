import { db } from "./db";
import { Prisma } from "@prisma/client";

export interface RecipeWithDetails {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  updatedAt?: Date;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber?: number | null;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  ingredients: any[];
  instructions: any[];
  category: string | null;
  tags: string[];
  isPublished?: boolean;
  isFavorite?: boolean;
}

export interface UserCustomRecipeWithDetails {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  ingredients: any[] | null;
  createdAt: Date;
  updatedAt: Date;
  isFavorite?: boolean;
}

/**
 * Get all published recipes
 */
export async function getRecipes(options: {
  category?: string;
  tag?: string;
  search?: string;
  limit?: number;
} = {}): Promise<RecipeWithDetails[]> {
  const { category, tag, search, limit } = options;

  const where: any = {
    isPublished: true,
  };

  if (category) {
    where.category = category;
  }

  if (tag) {
    where.tags = { has: tag };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const recipes = await db.recipe.findMany({
    where,
    orderBy: { title: "asc" },
    take: limit,
  });

  return recipes as RecipeWithDetails[];
}

/**
 * Get all recipes for admin (including unpublished)
 */
export async function getRecipesForAdmin(options: { limit?: number } = {}): Promise<RecipeWithDetails[]> {
  const recipes = await db.recipe.findMany({
    orderBy: { title: "asc" },
    take: options.limit ?? 500,
  });
  return recipes as RecipeWithDetails[];
}

/**
 * Get a single recipe by slug
 */
export async function getRecipeBySlug(slug: string): Promise<RecipeWithDetails | null> {
  const recipe = await db.recipe.findUnique({
    where: { slug },
  });

  if (!recipe || !recipe.isPublished) {
    return null;
  }

  return recipe as RecipeWithDetails;
}

/**
 * Get recipe categories
 */
export async function getRecipeCategories(): Promise<string[]> {
  const recipes = await db.recipe.findMany({
    where: { isPublished: true },
    select: { category: true },
  });

  const categories = new Set(
    recipes.map((r) => r.category).filter((c): c is string => c !== null)
  );

  return Array.from(categories).sort();
}

/**
 * Get all recipe tags
 */
export async function getRecipeTags(): Promise<string[]> {
  const recipes = await db.recipe.findMany({
    where: { isPublished: true },
    select: { tags: true },
  });

  const tags = new Set<string>();
  recipes.forEach((r) => {
    r.tags.forEach((tag) => tags.add(tag));
  });

  return Array.from(tags).sort();
}

/**
 * Generate grocery list from recipes
 */
export async function generateGroceryList(
  userId: string,
  recipeIds: string[],
  name?: string
) {
  // Get all recipes
  const recipes = await db.recipe.findMany({
    where: {
      id: { in: recipeIds },
      isPublished: true,
    },
  });

  // Aggregate ingredients
  const ingredientMap = new Map<string, { amount: string; unit: string }>();

  recipes.forEach((recipe) => {
    const ingredients = recipe.ingredients as any[];
    ingredients.forEach((ing) => {
      const key = ing.ingredient.toLowerCase();
      if (ingredientMap.has(key)) {
        // Merge amounts (simplified - in production, you'd want proper unit conversion)
        const existing = ingredientMap.get(key)!;
        // For now, just keep the first one or combine
        // In a real app, you'd want to handle unit conversions
      } else {
        ingredientMap.set(key, {
          amount: ing.amount || "",
          unit: ing.unit || "",
        });
      }
    });
  });

  // Create grocery list
  const groceryList = await db.groceryList.create({
    data: {
      userId,
      name: name || "Boodschappenlijst",
      items: {
        create: Array.from(ingredientMap.entries()).map(([ingredient, data]) => ({
          ingredient,
          amount: data.amount,
          unit: data.unit,
          recipeId: recipeIds[0], // Link to first recipe (simplified)
        })),
      },
    },
    include: {
      items: true,
    },
  });

  return groceryList;
}

/**
 * Get user's grocery lists
 */
export async function getUserGroceryLists(userId: string) {
  return db.groceryList.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        orderBy: { ingredient: "asc" },
      },
    },
  });
}

/**
 * Get or create meal plan for a week
 */
export async function getOrCreateMealPlan(
  userId: string,
  weekStart: Date
) {
  const weekStartDate = new Date(weekStart);
  weekStartDate.setHours(0, 0, 0, 0);

  return db.mealPlan.upsert({
    where: {
      userId_weekStart: {
        userId,
        weekStart: weekStartDate,
      },
    },
    update: {},
    create: {
      userId,
      weekStart: weekStartDate,
    },
    include: {
      items: {
        include: {
          recipe: true,
        },
        orderBy: [{ dayOfWeek: "asc" }, { mealType: "asc" }],
      },
    },
  });
}

/**
 * Add recipe to meal plan
 */
export async function addRecipeToMealPlan(
  mealPlanId: string,
  recipeId: string,
  dayOfWeek: number,
  mealType: string
) {
  const recipe = await db.recipe.findUnique({
    where: { id: recipeId },
    select: { id: true, isPublished: true, title: true },
  });

  if (!recipe || !recipe.isPublished) {
    throw new Error("Dit recept is niet meer beschikbaar om toe te voegen.");
  }

  return db.mealPlanItem.create({
    data: {
      mealPlanId,
      recipeId,
      dayOfWeek,
      mealType,
    },
    include: {
      recipe: true,
    },
  });
}

export async function addCustomMealPlanItem(input: {
  mealPlanId: string;
  dayOfWeek: number;
  mealType: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  ingredients?: Array<{
    name: string;
    brandName?: string | null;
    quantityGrams: number;
    servingDescription?: string | null;
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
    fiber?: number | null;
  }> | null;
}) {
  return db.mealPlanItem.create({
    data: {
      mealPlanId: input.mealPlanId,
      dayOfWeek: input.dayOfWeek,
      mealType: input.mealType,
      isCustom: true,
      customTitle: input.title,
      customDescription: input.description ?? null,
      customImageUrl: input.imageUrl ?? null,
      customCalories: input.calories ?? null,
      customProtein: input.protein ?? null,
      customCarbs: input.carbs ?? null,
      customFat: input.fat ?? null,
      customFiber: input.fiber ?? null,
      customIngredients: input.ingredients
        ? (input.ingredients.map((ingredient) => ({
            name: ingredient.name,
            brandName: ingredient.brandName ?? null,
            quantityGrams: ingredient.quantityGrams,
            servingDescription: ingredient.servingDescription ?? null,
            calories: ingredient.calories ?? null,
            protein: ingredient.protein ?? null,
            carbs: ingredient.carbs ?? null,
            fat: ingredient.fat ?? null,
            fiber: ingredient.fiber ?? null,
          })) as Prisma.InputJsonValue)
        : undefined,
    },
    include: {
      recipe: true,
    },
  });
}

export async function getUserCustomRecipes(userId: string) {
  const [recipes, favorites] = await Promise.all([
    db.userCustomRecipe.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    }),
    db.userFavoriteRecipe.findMany({
      where: { userId, customRecipeId: { not: null } },
      select: { customRecipeId: true },
    }),
  ]);

  const favoriteIds = new Set(
    favorites
      .map((favorite) => favorite.customRecipeId)
      .filter((value): value is string => Boolean(value))
  );

  return recipes.map((recipe) => ({
    ...recipe,
    isFavorite: favoriteIds.has(recipe.id),
  })) as UserCustomRecipeWithDetails[];
}

export async function getFavoriteRecipes(userId: string) {
  const favorites = await db.userFavoriteRecipe.findMany({
    where: { userId },
    include: {
      recipe: true,
      customRecipe: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return favorites;
}

export async function toggleFavoriteRecipe(input: {
  userId: string;
  recipeId?: string | null;
  customRecipeId?: string | null;
}) {
  if (!input.recipeId && !input.customRecipeId) {
    throw new Error("Een recept of eigen recept is verplicht.");
  }

  if (input.recipeId) {
    const existing = await db.userFavoriteRecipe.findUnique({
      where: {
        userId_recipeId: {
          userId: input.userId,
          recipeId: input.recipeId,
        },
      },
    });

    if (existing) {
      await db.userFavoriteRecipe.delete({ where: { id: existing.id } });
      return { isFavorite: false };
    }

    await db.userFavoriteRecipe.create({
      data: {
        userId: input.userId,
        recipeId: input.recipeId,
      },
    });
    return { isFavorite: true };
  }

  const existing = await db.userFavoriteRecipe.findUnique({
    where: {
      userId_customRecipeId: {
        userId: input.userId,
        customRecipeId: input.customRecipeId!,
      },
    },
  });

  if (existing) {
    await db.userFavoriteRecipe.delete({ where: { id: existing.id } });
    return { isFavorite: false };
  }

  await db.userFavoriteRecipe.create({
    data: {
      userId: input.userId,
      customRecipeId: input.customRecipeId!,
    },
  });
  return { isFavorite: true };
}

export async function createUserCustomRecipe(input: {
  userId: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  ingredients?: Array<{
    name: string;
    brandName?: string | null;
    quantityGrams: number;
    servingDescription?: string | null;
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
    fiber?: number | null;
  }> | null;
}) {
  return db.userCustomRecipe.create({
    data: {
      userId: input.userId,
      title: input.title,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      calories: input.calories ?? null,
      protein: input.protein ?? null,
      carbs: input.carbs ?? null,
      fat: input.fat ?? null,
      fiber: input.fiber ?? null,
      ingredients: input.ingredients
        ? (input.ingredients.map((ingredient) => ({
            name: ingredient.name,
            brandName: ingredient.brandName ?? null,
            quantityGrams: ingredient.quantityGrams,
            servingDescription: ingredient.servingDescription ?? null,
            calories: ingredient.calories ?? null,
            protein: ingredient.protein ?? null,
            carbs: ingredient.carbs ?? null,
            fat: ingredient.fat ?? null,
            fiber: ingredient.fiber ?? null,
          })) as Prisma.InputJsonValue)
        : undefined,
    },
  }) as Promise<UserCustomRecipeWithDetails>;
}

export async function updateMealPlanSettings(
  mealPlanId: string,
  input: {
    calorieCalculatorEnabled?: boolean;
  }
) {
  return db.mealPlan.update({
    where: { id: mealPlanId },
    data: {
      ...(input.calorieCalculatorEnabled !== undefined
        ? { calorieCalculatorEnabled: input.calorieCalculatorEnabled }
        : {}),
    },
    include: {
      items: {
        include: {
          recipe: true,
        },
        orderBy: [{ dayOfWeek: "asc" }, { mealType: "asc" }],
      },
    },
  });
}

function recipeMatchesMealSlot(
  recipe: {
    title: string;
    description: string | null;
    category: string | null;
    tags: string[];
  },
  mealType: string
) {
  const haystack = [
    recipe.category,
    recipe.title,
    recipe.description,
    ...recipe.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const lookup: Record<string, string[]> = {
    breakfast: ["ontbijt", "breakfast"],
    lunch: ["lunch", "middag"],
    dinner: ["avond", "diner", "dinner", "avondmaal"],
    snack: ["snack", "tussendoor"],
  };

  return lookup[mealType]?.some((keyword) => haystack.includes(keyword)) ?? true;
}

function scoreRecipeForGoal(
  recipe: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    tags: string[];
  },
  goal?: string | null
) {
  const calories = recipe.calories ?? 0;
  const protein = recipe.protein ?? 0;
  const carbs = recipe.carbs ?? 0;
  const fat = recipe.fat ?? 0;
  const tags = recipe.tags.map((tag) => tag.toLowerCase());

  switch (goal) {
    case "MUSCLE_GAIN":
      return protein * 5 + calories;
    case "WEIGHT_GAIN":
      return calories * 2 + fat + carbs;
    case "SYMPTOM_RELIEF":
      return (tags.includes("reset") ? 500 : 0) + (tags.includes("koolhydraatarm") ? 150 : 0) - carbs;
    case "WEIGHT_LOSS":
    default:
      return (tags.includes("koolhydraatarm") ? 250 : 0) + protein * 4 - calories - carbs;
  }
}

function pickRotatingRecipe<T extends { id: string }>(
  recipes: T[],
  usedRecipeIds: Set<string>,
  fallbackIndex: number
) {
  const freshRecipe = recipes.find((recipe) => !usedRecipeIds.has(recipe.id));
  if (freshRecipe) {
    usedRecipeIds.add(freshRecipe.id);
    return freshRecipe;
  }

  const fallbackRecipe = recipes[fallbackIndex % recipes.length] ?? null;
  if (fallbackRecipe) {
    usedRecipeIds.add(fallbackRecipe.id);
  }
  return fallbackRecipe;
}

export async function autoGenerateMealPlanForWeek(
  userId: string,
  weekStart: Date
) {
  const mealPlan = await getOrCreateMealPlan(userId, weekStart);

  await db.mealPlanItem.deleteMany({
    where: { mealPlanId: mealPlan.id },
  });

  const [recipes, profile] = await Promise.all([
    db.recipe.findMany({
      where: { isPublished: true },
      orderBy: { title: "asc" },
    }),
    db.userHealthProfile.findUnique({
      where: { userId },
      select: { goal: true },
    }),
  ]);

  const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;
  const usedRecipeIds = new Set<string>();

  for (const mealType of mealTypes) {
    const matchingRecipes = recipes
      .filter((recipe) => recipeMatchesMealSlot(recipe, mealType))
      .sort((a, b) => scoreRecipeForGoal(b, profile?.goal) - scoreRecipeForGoal(a, profile?.goal));

    const candidates = matchingRecipes.length > 0 ? matchingRecipes : recipes;

    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
      const pickedRecipe = pickRotatingRecipe(candidates, usedRecipeIds, dayOfWeek);
      if (!pickedRecipe) continue;

      await db.mealPlanItem.create({
        data: {
          mealPlanId: mealPlan.id,
          recipeId: pickedRecipe.id,
          dayOfWeek,
          mealType,
        },
      });
    }
  }

  return db.mealPlan.findUniqueOrThrow({
    where: { id: mealPlan.id },
    include: {
      items: {
        include: {
          recipe: true,
        },
        orderBy: [{ dayOfWeek: "asc" }, { mealType: "asc" }],
      },
    },
  });
}

export async function getMealPlanHistory(userId: string, limit = 12) {
  return db.mealPlan.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          recipe: true,
        },
        orderBy: [{ dayOfWeek: "asc" }, { mealType: "asc" }],
      },
    },
    orderBy: { weekStart: "desc" },
    take: limit,
  });
}

/**
 * Remove recipe from meal plan
 */
export async function removeRecipeFromMealPlan(itemId: string) {
  return db.mealPlanItem.delete({
    where: { id: itemId },
  });
}
