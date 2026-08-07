import type { FoodSearchResult, FoodServing } from "@/lib/open-food-facts";

type HealthTargets = {
  goal?: string | null;
  calorieTarget?: number | null;
  proteinTargetGrams?: number | null;
  carbsTargetGrams?: number | null;
  fatTargetGrams?: number | null;
};

type ScaledNutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

const MEAL_SHARE: Record<string, number> = {
  breakfast: 0.25,
  lunch: 0.3,
  dinner: 0.3,
  snack: 0.15,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function getReferenceServing(food: FoodSearchResult) {
  return (
    food.servings.find((serving) => serving.metricUnit === "g" && serving.metricAmount === 100) ??
    food.servings.find((serving) => serving.metricUnit === "ml" && serving.metricAmount === 100) ??
    food.servings.find((serving) => typeof serving.metricAmount === "number" && serving.metricAmount > 0) ??
    food.servings[0] ??
    null
  );
}

function getCaloriesPerGram(serving: FoodServing | null) {
  if (!serving || !serving.metricAmount || serving.metricAmount <= 0) {
    return null;
  }

  return serving.calories / serving.metricAmount;
}

function classifyFood(name: string) {
  const value = name.toLowerCase();

  if (/(chia|lijnzaad|hennep|sesam|pompoenpit|zonnebloempit)/.test(value)) return "seeds";
  if (/(noten|amandel|walnoot|cashew|pecan|hazelnoot|pistache|pinda)/.test(value)) return "nuts";
  if (/(olie|olijfolie|kokosolie|avocado-olie)/.test(value)) return "oil";
  if (/(kip|kalkoen|tonijn|zalm|tofu|tempeh|ei|garnalen|vis)/.test(value)) return "protein";
  if (/(rijst|quinoa|havermout|boekweit|aardappel|zoete aardappel|wrap|pasta)/.test(value)) return "starch";
  if (/(chia pudding|yoghurt|kwark|kokosyoghurt|skyr|pudding|smoothie)/.test(value)) return "bowl";
  return "generic";
}

export function suggestQuantityForFood(food: FoodSearchResult, mealType: string, healthTargets?: HealthTargets) {
  const serving = getReferenceServing(food);
  const caloriesPerGram = getCaloriesPerGram(serving);
  const baseMealCalories = Math.max(healthTargets?.calorieTarget ?? 1800, 1200) * (MEAL_SHARE[mealType] ?? 0.25);
  const category = classifyFood(`${food.brandName || ""} ${food.name}`);

  if (!caloriesPerGram) {
    return category === "seeds" || category === "nuts" ? 30 : mealType === "snack" ? 40 : 100;
  }

  let targetCalories = baseMealCalories * 0.3;

  if (category === "seeds") targetCalories = baseMealCalories * 0.15;
  if (category === "nuts") targetCalories = baseMealCalories * 0.18;
  if (category === "oil") targetCalories = baseMealCalories * 0.08;
  if (category === "protein") targetCalories = baseMealCalories * (mealType === "breakfast" ? 0.28 : 0.42);
  if (category === "starch") targetCalories = baseMealCalories * (mealType === "snack" ? 0.2 : 0.32);
  if (category === "bowl") targetCalories = baseMealCalories * 0.45;

  if (healthTargets?.goal === "WEIGHT_LOSS") {
    targetCalories *= 0.9;
  } else if (healthTargets?.goal === "WEIGHT_GAIN" || healthTargets?.goal === "MUSCLE_GAIN") {
    targetCalories *= 1.08;
  }

  const grams = targetCalories / caloriesPerGram;
  const max = mealType === "snack" ? 120 : 260;
  const min = category === "oil" ? 5 : category === "seeds" || category === "nuts" ? 15 : 40;

  return Math.round(clamp(grams, min, max));
}

export function scaleServingToQuantity(serving: FoodServing | null, quantity: number): ScaledNutrition {
  if (!serving) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }

  const metricAmount = serving.metricAmount && serving.metricAmount > 0 ? serving.metricAmount : 1;
  const multiplier = quantity > 0 ? quantity / metricAmount : 0;

  return {
    calories: round(serving.calories * multiplier),
    protein: round(serving.protein * multiplier),
    carbs: round(serving.carbs * multiplier),
    fat: round(serving.fat * multiplier),
    fiber: round(serving.fiber * multiplier),
  };
}

export function pickReferenceServing(food: FoodSearchResult) {
  return getReferenceServing(food);
}
