import { db } from "./db";

export interface RecipeWithDetails {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  ingredients: any[];
  instructions: any[];
  category: string | null;
  tags: string[];
  isPublished?: boolean;
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

/**
 * Remove recipe from meal plan
 */
export async function removeRecipeFromMealPlan(itemId: string) {
  return db.mealPlanItem.delete({
    where: { id: itemId },
  });
}
