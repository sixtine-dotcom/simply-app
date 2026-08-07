"use client";

import { ChangeEvent, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  ImagePlus,
  Loader2,
  PencilLine,
  Plus,
  Search,
  Upload,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import type { FoodSearchResult } from "@/lib/open-food-facts";
import { pickReferenceServing, scaleServingToQuantity, suggestQuantityForFood } from "@/lib/nutrition-estimates";
import { FavoriteRecipeButton } from "@/components/recipes/favorite-recipe-button";

const DAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
const MEAL_TYPES = [
  { value: "breakfast", label: "Ontbijt" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Avondmaal" },
  { value: "snack", label: "Snack" },
];
const PRESET_TAG_FILTERS = ["reset", "keto", "koolhydraatarm"] as const;

type Recipe = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  tags?: string[];
  ingredients?: Array<{ amount?: string; unit?: string; ingredient?: string }>;
};

type MealPlanItem = {
  id: string;
  dayOfWeek: number;
  mealType: string;
  isCustom?: boolean;
  customTitle?: string | null;
  customDescription?: string | null;
  customImageUrl?: string | null;
  customCalories?: number | null;
  customProtein?: number | null;
  customCarbs?: number | null;
  customFat?: number | null;
  customFiber?: number | null;
  customIngredients?: Array<{
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
  recipe?: Recipe | null;
};

type MealPlan = {
  id: string;
  weekStart: string;
  calorieCalculatorEnabled: boolean;
  items: MealPlanItem[];
};

type UserCustomRecipe = {
  id: string;
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
  isFavorite?: boolean;
};

type CustomEntryForm = {
  title: string;
  description: string;
  imageUrl: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
};

type HealthProfile = {
  goal?: string | null;
  calorieTarget?: number | null;
  proteinTargetGrams?: number | null;
  carbsTargetGrams?: number | null;
  fatTargetGrams?: number | null;
};

type SelectedCustomIngredient = {
  id: string;
  food: FoodSearchResult;
  servingId: string;
  quantityGrams: string;
};

const emptyCustomEntry: CustomEntryForm = {
  title: "",
  description: "",
  imageUrl: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  fiber: "",
};

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateString(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 0, 0, 0, 0);
}

function getWeekStart() {
  const today = new Date();
  const monday = new Date(today);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return formatLocalDate(monday);
}

function getMealTypeLabel(mealType: string) {
  return MEAL_TYPES.find((meal) => meal.value === mealType)?.label ?? mealType;
}

function hasMealSlotSelection(dayOfWeek: number | null, mealType: string | null) {
  return dayOfWeek !== null && Boolean(mealType);
}

function getDayLabel(dayOfWeek: number | null) {
  if (dayOfWeek === null) return "dag";
  return DAYS[dayOfWeek] ?? "dag";
}

function toNumberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function getItemTitle(item: MealPlanItem) {
  return item.isCustom ? item.customTitle ?? "Eigen recept" : item.recipe?.title ?? "Recept";
}

function getItemDescription(item: MealPlanItem) {
  if (!item.isCustom) return item.recipe?.description;
  if (item.customDescription) return item.customDescription;
  if (item.customIngredients?.length) {
    return item.customIngredients
      .slice(0, 4)
      .map((ingredient) => `${ingredient.quantityGrams} g ${ingredient.name}`)
      .join(", ");
  }
  return null;
}

function getItemImage(item: MealPlanItem) {
  return item.isCustom ? item.customImageUrl : item.recipe?.imageUrl;
}

function getItemCalories(item: MealPlanItem) {
  return item.isCustom ? item.customCalories ?? 0 : item.recipe?.calories ?? 0;
}

function getItemMacros(item: MealPlanItem) {
  if (item.isCustom) {
    return {
      protein: item.customProtein ?? 0,
      carbs: item.customCarbs ?? 0,
      fat: item.customFat ?? 0,
      fiber: item.customFiber ?? 0,
    };
  }

  return {
    protein: item.recipe?.protein ?? 0,
    carbs: item.recipe?.carbs ?? 0,
    fat: item.recipe?.fat ?? 0,
    fiber: item.recipe?.fiber ?? 0,
  };
}

function recipeMatchesMealFocus(recipe: Recipe, mealFilter: string | null) {
  if (!mealFilter) return true;

  const haystack = [
    recipe.category,
    recipe.title,
    recipe.description,
    ...(recipe.tags ?? []),
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

  return lookup[mealFilter]?.some((keyword) => haystack.includes(keyword)) ?? true;
}

export default function MealPlanPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const addRecipeId = searchParams.get("addRecipe");
  const requestedWeekStart = searchParams.get("weekStart");
  const customImageInputId = useId();

  const [weekStart, setWeekStart] = useState(() => requestedWeekStart || getWeekStart());
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [savedCustomRecipes, setSavedCustomRecipes] = useState<UserCustomRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [activeMealFilter, setActiveMealFilter] = useState<string | null>(null);
  const [selectorMode, setSelectorMode] = useState<"library" | "custom">("library");
  const [customEntry, setCustomEntry] = useState<CustomEntryForm>(emptyCustomEntry);
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(null);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [ingredientResults, setIngredientResults] = useState<FoodSearchResult[]>([]);
  const [isSearchingIngredients, setIsSearchingIngredients] = useState(false);
  const [customIngredients, setCustomIngredients] = useState<SelectedCustomIngredient[]>([]);
  const [autoNutritionEnabled, setAutoNutritionEnabled] = useState(true);
  const [saveCustomToAccount, setSaveCustomToAccount] = useState(true);
  const [isUploadingCustomImage, setIsUploadingCustomImage] = useState(false);
  const [isGeneratingWeek, setIsGeneratingWeek] = useState(false);

  useEffect(() => {
    void loadMealPlan();
    void loadRecipes();
  }, [weekStart]);

  useEffect(() => {
    void loadHealthProfile();
    void loadSavedCustomRecipes();
  }, []);

  useEffect(() => {
    if (addRecipeId) {
      setSelectedDay(0);
      setSelectedMeal("breakfast");
      setShowRecipeSelector(true);
      setSelectorMode("library");
    }
  }, [addRecipeId]);

  useEffect(() => {
    if (requestedWeekStart) {
      setWeekStart(requestedWeekStart);
    }
  }, [requestedWeekStart]);

  useEffect(() => {
    if (selectorMode !== "custom") return;

    const query = ingredientSearch.trim();
    if (query.length < 2) {
      setIngredientResults([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void searchIngredientFoods(query);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [ingredientSearch, selectorMode]);

  async function loadMealPlan() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/recipes/meal-plan?weekStart=${weekStart}`);
      if (!response.ok) throw new Error("Kon weekmenu niet laden");
      const data = await response.json();
      setMealPlan(data);
    } catch (error) {
      console.error("Failed to load meal plan:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadRecipes() {
    try {
      const response = await fetch("/api/recipes?limit=100");
      if (!response.ok) throw new Error("Kon recepten niet laden");
      const data = await response.json();
      setRecipes(data);
    } catch (error) {
      console.error("Failed to load recipes:", error);
    }
  }

  async function loadHealthProfile() {
    try {
      const response = await fetch("/api/user/health-profile");
      if (!response.ok) return;
      const data = await response.json();
      setHealthProfile(data.profile ?? null);
    } catch (error) {
      console.error("Failed to load health profile:", error);
    }
  }

  async function loadSavedCustomRecipes() {
    try {
      const response = await fetch("/api/recipes/custom");
      if (!response.ok) throw new Error("Kon eigen recepten niet laden");
      const data = await response.json();
      setSavedCustomRecipes(data);
    } catch (error) {
      console.error("Failed to load custom recipes:", error);
    }
  }

  async function searchIngredientFoods(query: string) {
    setIsSearchingIngredients(true);
    try {
      const response = await fetch(`/api/food/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Zoeken mislukt");
      }
      setIngredientResults(data.foods || []);
    } catch (error) {
      toast({
        title: "Zoeken mislukt",
        description: error instanceof Error ? error.message : "Kon ingredienten niet ophalen",
        variant: "destructive",
      });
    } finally {
      setIsSearchingIngredients(false);
    }
  }

  async function handleCustomImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingCustomImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon afbeelding niet uploaden");
      }

      setCustomEntry((current) => ({
        ...current,
        imageUrl: data.url,
      }));

      toast({
        title: "Foto toegevoegd",
        description: "De maaltijdfoto is gekoppeld aan dit recept.",
      });
    } catch (error) {
      toast({
        title: "Upload mislukt",
        description: error instanceof Error ? error.message : "Kon afbeelding niet uploaden",
        variant: "destructive",
      });
    } finally {
      event.target.value = "";
      setIsUploadingCustomImage(false);
    }
  }

  function openSelector(dayOfWeek: number, mealType: string, mode: "library" | "custom" = "library") {
    setSelectedDay(dayOfWeek);
    setSelectedMeal(mealType);
    setSelectorMode(mode);
    setShowRecipeSelector(true);
  }

  function closeSelector() {
    setShowRecipeSelector(false);
    setSelectedDay(null);
    setSelectedMeal(null);
    setRecipeSearch("");
    setActiveTagFilter(null);
    setActiveMealFilter(null);
    setSelectorMode("library");
    setCustomEntry(emptyCustomEntry);
    setIngredientSearch("");
    setIngredientResults([]);
    setCustomIngredients([]);
    setAutoNutritionEnabled(true);
    setSaveCustomToAccount(true);
  }

  function changeWeek(direction: "prev" | "next") {
    const current = parseLocalDateString(weekStart);
    current.setDate(current.getDate() + (direction === "next" ? 7 : -7));
    setWeekStart(formatLocalDate(current));
  }

  function setManualNutritionField(field: keyof Pick<CustomEntryForm, "calories" | "protein" | "carbs" | "fat" | "fiber">, value: string) {
    setAutoNutritionEnabled(false);
    setCustomEntry((current) => ({ ...current, [field]: value }));
  }

  function handleAddIngredient(food: FoodSearchResult) {
    const referenceServing = pickReferenceServing(food);
    const suggestedQuantity = suggestQuantityForFood(food, selectedMeal ?? "lunch", healthProfile ?? undefined);

    setCustomIngredients((current) => [
      ...current,
      {
        id: `${food.id}-${Date.now()}`,
        food,
        servingId: referenceServing?.id ?? food.servings[0]?.id ?? "",
        quantityGrams: String(suggestedQuantity),
      },
    ]);

    setIngredientSearch("");
    setIngredientResults([]);
    setAutoNutritionEnabled(true);
  }

  async function handleAddRecipe(recipeId: string) {
    if (selectedDay === null || !selectedMeal) {
      toast({
        title: "Fout",
        description: "Selecteer eerst een dag en maaltijd.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/recipes/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart,
          recipeId,
          dayOfWeek: selectedDay,
          mealType: selectedMeal,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon recept niet toevoegen");
      }

      await loadMealPlan();
      closeSelector();
      toast({
        title: "Toegevoegd",
        description: "Recept is toegevoegd aan je weekmenu.",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon recept niet toevoegen",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddSavedCustomRecipe(recipe: UserCustomRecipe) {
    if (selectedDay === null || !selectedMeal) {
      toast({
        title: "Fout",
        description: "Selecteer eerst een dag en maaltijd.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/recipes/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart,
          dayOfWeek: selectedDay,
          mealType: selectedMeal,
          customEntry: {
            title: recipe.title,
            description: recipe.description ?? null,
            imageUrl: recipe.imageUrl ?? null,
            calories: recipe.calories ?? null,
            protein: recipe.protein ?? null,
            carbs: recipe.carbs ?? null,
            fat: recipe.fat ?? null,
            fiber: recipe.fiber ?? null,
            ingredients: recipe.ingredients ?? [],
          },
          saveToAccount: false,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon eigen recept niet toevoegen");
      }

      await loadMealPlan();
      closeSelector();
      toast({
        title: "Toegevoegd",
        description: "Je opgeslagen recept staat nu in je weekmenu.",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon eigen recept niet toevoegen",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const ingredientRows = useMemo(() => {
    return customIngredients.map((item) => {
      const selectedServing =
        item.food.servings.find((serving) => serving.id === item.servingId) ??
        pickReferenceServing(item.food) ??
        item.food.servings[0] ??
        null;

      const quantity = Number(item.quantityGrams.replace(",", "."));
      const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
      const totals = scaleServingToQuantity(selectedServing, normalizedQuantity);

      return {
        ...item,
        selectedServing,
        quantity: normalizedQuantity,
        totals,
      };
    });
  }, [customIngredients]);

  const ingredientTotals = useMemo(() => {
    return ingredientRows.reduce(
      (sum, item) => ({
        calories: sum.calories + item.totals.calories,
        protein: sum.protein + item.totals.protein,
        carbs: sum.carbs + item.totals.carbs,
        fat: sum.fat + item.totals.fat,
        fiber: sum.fiber + item.totals.fiber,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );
  }, [ingredientRows]);

  const selectedSlotLabel = hasMealSlotSelection(selectedDay, selectedMeal)
    ? `${DAYS[selectedDay as number]} • ${getMealTypeLabel(selectedMeal as string)}`
    : null;

  useEffect(() => {
    if (selectorMode !== "custom" || !autoNutritionEnabled) return;

    setCustomEntry((current) => ({
      ...current,
      calories: ingredientRows.length ? String(Math.round(ingredientTotals.calories)) : "",
      protein: ingredientRows.length ? String(Math.round(ingredientTotals.protein)) : "",
      carbs: ingredientRows.length ? String(Math.round(ingredientTotals.carbs)) : "",
      fat: ingredientRows.length ? String(Math.round(ingredientTotals.fat)) : "",
      fiber: ingredientRows.length ? String(Math.round(ingredientTotals.fiber)) : "",
    }));
  }, [autoNutritionEnabled, ingredientRows.length, ingredientTotals, selectorMode]);

  async function handleSaveCustomEntry() {
    if (selectedDay === null || !selectedMeal) {
      toast({
        title: "Fout",
        description: "Selecteer eerst een dag en maaltijd.",
        variant: "destructive",
      });
      return;
    }

    if (!customEntry.title.trim()) {
      toast({
        title: "Titel ontbreekt",
        description: "Geef je eigen recept minstens een titel.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/recipes/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart,
          dayOfWeek: selectedDay,
          mealType: selectedMeal,
          customEntry: {
            title: customEntry.title.trim(),
            description: customEntry.description.trim() || null,
            imageUrl: customEntry.imageUrl.trim() || null,
            calories: toNumberOrNull(customEntry.calories),
            protein: toNumberOrNull(customEntry.protein),
            carbs: toNumberOrNull(customEntry.carbs),
            fat: toNumberOrNull(customEntry.fat),
            fiber: toNumberOrNull(customEntry.fiber),
            ingredients: ingredientRows.map((item) => ({
              name: item.food.name,
              brandName: item.food.brandName,
              quantityGrams: Math.round(item.quantity),
              servingDescription: item.selectedServing?.description ?? null,
              calories: Math.round(item.totals.calories),
              protein: Math.round(item.totals.protein),
              carbs: Math.round(item.totals.carbs),
              fat: Math.round(item.totals.fat),
              fiber: Math.round(item.totals.fiber),
            })),
          },
          saveToAccount: saveCustomToAccount,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon eigen recept niet opslaan");
      }

      await loadSavedCustomRecipes();
      await loadMealPlan();
      closeSelector();
      toast({
        title: "Eigen recept toegevoegd",
        description: saveCustomToAccount
          ? "Je eigen invoer staat nu in je weekmenu en is bewaard in je account."
          : "Je eigen invoer staat nu in je weekmenu.",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon eigen recept niet opslaan",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveRecipe(itemId: string) {
    try {
      const response = await fetch(`/api/recipes/meal-plan?itemId=${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Kon item niet verwijderen");

      await loadMealPlan();
      toast({
        title: "Verwijderd",
        description: "Item is verwijderd uit je weekmenu.",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon item niet verwijderen",
        variant: "destructive",
      });
    }
  }

  async function handleCalorieToggle() {
    if (!mealPlan) return;

    const nextValue = !mealPlan.calorieCalculatorEnabled;
    setMealPlan({ ...mealPlan, calorieCalculatorEnabled: nextValue });

    try {
      const response = await fetch("/api/recipes/meal-plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart,
          calorieCalculatorEnabled: nextValue,
        }),
      });

      if (!response.ok) throw new Error("Kon caloriecalculator niet aanpassen");
      const updated = await response.json();
      setMealPlan(updated);
    } catch (error) {
      setMealPlan({ ...mealPlan, calorieCalculatorEnabled: !nextValue });
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon instelling niet opslaan",
        variant: "destructive",
      });
    }
  }

  async function handleAutoGenerateWeekMenu() {
    const shouldOverwrite =
      !mealPlan?.items?.length ||
      window.confirm("Deze actie vult je hele weekmenu automatisch en vervangt de huidige ingevulde maaltijden. Wil je doorgaan?");

    if (!shouldOverwrite) {
      return;
    }

    setIsGeneratingWeek(true);
    try {
      const response = await fetch("/api/recipes/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart,
          action: "autogenerate",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon weekmenu niet automatisch samenstellen");
      }

      setMealPlan(data.mealPlan);
      toast({
        title: "Weekmenu samengesteld",
        description: "Je weekmenu is automatisch ingevuld vanuit je receptenbibliotheek.",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon weekmenu niet automatisch samenstellen",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingWeek(false);
    }
  }

  function getMealForDay(dayOfWeek: number, mealType: string) {
    if (!mealPlan) return null;
    return mealPlan.items.find((item) => item.dayOfWeek === dayOfWeek && item.mealType === mealType) ?? null;
  }

  const filteredRecipes = useMemo(() => {
    const normalizedSearch = recipeSearch.trim().toLowerCase();

    return recipes.filter((recipe) => {
      const haystack = [
        recipe.title,
        recipe.description,
        recipe.category,
        ...(recipe.tags ?? []),
        ...(recipe.ingredients ?? []).map((ingredient) =>
          [ingredient?.amount, ingredient?.unit, ingredient?.ingredient].filter(Boolean).join(" ")
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      const matchesTag = !activeTagFilter || (recipe.tags ?? []).includes(activeTagFilter);
      const matchesMealType = recipeMatchesMealFocus(recipe, activeMealFilter);

      return matchesSearch && matchesTag && matchesMealType;
    });
  }, [activeMealFilter, activeTagFilter, recipeSearch, recipes]);

  const filteredSavedCustomRecipes = useMemo(() => {
    const normalizedSearch = recipeSearch.trim().toLowerCase();

    return savedCustomRecipes.filter((recipe) => {
      const haystack = [
        recipe.title,
        recipe.description,
        ...(recipe.ingredients ?? []).map((ingredient) =>
          [ingredient?.quantityGrams, ingredient?.name, ingredient?.brandName].filter(Boolean).join(" ")
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !normalizedSearch || haystack.includes(normalizedSearch);
    });
  }, [recipeSearch, savedCustomRecipes]);

  const daySummaries = useMemo(() => {
    return DAYS.map((_, dayIndex) => {
      const items = mealPlan?.items.filter((item) => item.dayOfWeek === dayIndex) ?? [];
      const calories = items.reduce((sum, item) => sum + getItemCalories(item), 0);
      const macros = items.reduce(
        (sum, item) => {
          const current = getItemMacros(item);
          return {
            protein: sum.protein + current.protein,
            carbs: sum.carbs + current.carbs,
            fat: sum.fat + current.fat,
          };
        },
        { protein: 0, carbs: 0, fat: 0 }
      );

      return { calories, ...macros };
    });
  }, [mealPlan]);

  const weeklyTotals = useMemo(() => {
    return daySummaries.reduce(
      (sum, day) => ({
        calories: sum.calories + day.calories,
        protein: sum.protein + day.protein,
        carbs: sum.carbs + day.carbs,
        fat: sum.fat + day.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [daySummaries]);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Link
        href="/recipes"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Terug naar recepten
      </Link>

      <div className="app-panel app-halo mb-8 overflow-hidden">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="app-kicker">Meal planning</p>
            <h1 className="mt-3 flex items-center gap-3 font-display text-3xl tracking-tight text-slate-950 md:text-5xl">
              <Calendar className="h-7 w-7 text-primary" />
              Weekmenu
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Stel per dag en maaltijd een duidelijk weekmenu samen, filter slim op type gerecht en voeg ook eigen recepten toe.
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-[24px] border border-white/70 bg-white/70 p-4 shadow-sm">
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => changeWeek("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              <span className="min-w-[190px] text-center text-sm font-medium">
                {parseLocalDateString(weekStart).toLocaleDateString("nl-BE", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <Button variant="outline" size="sm" onClick={() => changeWeek("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-left">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-950">Auto caloriecalculator</p>
                <p className="text-xs text-muted-foreground">
                  {mealPlan?.calorieCalculatorEnabled
                    ? "Toont totaal kcal en macro's op basis van recepten en eigen invoer."
                    : "Uitgeschakeld. Je kan nog steeds eigen recepten handmatig invullen."}
                </p>
              </div>
              <Switch
                checked={Boolean(mealPlan?.calorieCalculatorEnabled)}
                onCheckedChange={() => void handleCalorieToggle()}
                ariaLabel="Auto caloriecalculator"
              />
            </div>

            <Button
              type="button"
              onClick={() => void handleAutoGenerateWeekMenu()}
              disabled={isGeneratingWeek || isLoading}
              className="justify-center"
            >
              {isGeneratingWeek ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Laat weekmenu samenstellen
            </Button>
          </div>
        </div>
      </div>

      {mealPlan?.calorieCalculatorEnabled && (
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card className="app-halo">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Week kcal</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{weeklyTotals.calories}</p>
            </CardContent>
          </Card>
          <Card className="app-halo">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Eiwitten</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{weeklyTotals.protein}g</p>
            </CardContent>
          </Card>
          <Card className="app-halo">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Koolhydraten</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{weeklyTotals.carbs}g</p>
            </CardContent>
          </Card>
          <Card className="app-halo">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Vetten</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{weeklyTotals.fat}g</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="app-halo">
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px]">
                <thead>
                  <tr>
                    <th className="p-2 text-left font-display text-sm tracking-tight">Dag</th>
                    {MEAL_TYPES.map((meal) => (
                      <th key={meal.value} className="p-2 text-left font-display text-sm tracking-tight">
                        {meal.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, dayIndex) => (
                    <tr key={day} className="border-t border-black/5 align-top">
                      <td className="p-3">
                        <p className="font-medium">{day}</p>
                        {mealPlan?.calorieCalculatorEnabled && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {daySummaries[dayIndex].calories} kcal
                          </p>
                        )}
                      </td>
                      {MEAL_TYPES.map((meal) => {
                        const mealItem = getMealForDay(dayIndex, meal.value);

                        return (
                          <td key={meal.value} className="p-3">
                            {mealItem ? (
                              <div className="rounded-[24px] border border-white/70 bg-white/78 p-3 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start gap-3">
                                      {getItemImage(mealItem) ? (
                                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-stone-100">
                                          <img
                                            src={getItemImage(mealItem) ?? ""}
                                            alt={getItemTitle(mealItem)}
                                            className="h-full w-full object-cover"
                                          />
                                        </div>
                                      ) : null}
                                      <div className="min-w-0">
                                    {mealItem.isCustom ? (
                                      <p className="text-sm font-semibold text-slate-950">{getItemTitle(mealItem)}</p>
                                    ) : (
                                      <Link
                                        href={`/recipes/${mealItem.recipe?.slug}`}
                                        className="text-sm font-semibold text-slate-950 hover:text-primary"
                                      >
                                        {getItemTitle(mealItem)}
                                      </Link>
                                    )}
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {mealItem.isCustom ? "Eigen invoer" : "Uit receptenbibliotheek"}
                                    </p>
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => void handleRemoveRecipe(mealItem.id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                {getItemDescription(mealItem) && (
                                  <p className="mt-3 line-clamp-3 text-xs text-muted-foreground">
                                    {getItemDescription(mealItem)}
                                  </p>
                                )}
                                {mealPlan?.calorieCalculatorEnabled && (
                                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                    <span className="rounded-full bg-orange-100 px-2.5 py-1 text-orange-700">
                                      {getItemCalories(mealItem)} kcal
                                    </span>
                                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700">
                                      P {getItemMacros(mealItem).protein}g
                                    </span>
                                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700">
                                      KH {getItemMacros(mealItem).carbs}g
                                    </span>
                                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700">
                                      V {getItemMacros(mealItem).fat}g
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openSelector(dayIndex, meal.value, "library")}
                                  className="h-11 w-full justify-start text-muted-foreground hover:text-foreground"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Kies uit recepten
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openSelector(dayIndex, meal.value, "custom")}
                                  className="h-11 w-full justify-start"
                                >
                                  <PencilLine className="mr-2 h-4 w-4" />
                                  Eigen recept ingeven
                                </Button>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {showRecipeSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="app-halo flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden">
            <CardHeader className="border-b border-black/5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle className="font-display text-2xl tracking-tight">
                    {selectorMode === "library" ? "Recept kiezen" : "Eigen recept toevoegen"}
                  </CardTitle>
                  <CardDescription>
                    {selectedSlotLabel ?? "Kies eerst een dag en maaltijd voor dit recept."}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={selectorMode === "library" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectorMode("library")}
                    >
                      Uit bibliotheek
                    </Button>
                    <Button
                      type="button"
                      variant={selectorMode === "custom" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectorMode("custom")}
                    >
                      Eigen invoer
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={closeSelector}
                      className="h-9 w-9 p-0"
                      aria-label="Sluit venster"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="min-h-0 flex-1 overflow-y-auto p-6">
              <input
                id={customImageInputId}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => void handleCustomImageUpload(event)}
              />

              <div className="mb-6 rounded-[24px] border border-white/70 bg-white/85 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                  <div className="min-w-[220px] flex-1 space-y-2">
                    <Label htmlFor="meal-plan-day">Dag</Label>
                    <select
                      id="meal-plan-day"
                      value={selectedDay ?? ""}
                      onChange={(e) => setSelectedDay(e.target.value === "" ? null : Number(e.target.value))}
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Kies een dag</option>
                      {DAYS.map((day, index) => (
                        <option key={day} value={index}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-[220px] flex-1 space-y-2">
                    <Label htmlFor="meal-plan-type">Maaltijd</Label>
                    <select
                      id="meal-plan-type"
                      value={selectedMeal ?? ""}
                      onChange={(e) => setSelectedMeal(e.target.value || null)}
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Kies een maaltijd</option>
                      {MEAL_TYPES.map((meal) => (
                        <option key={meal.value} value={meal.value}>
                          {meal.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 text-sm text-muted-foreground">
                    {selectedSlotLabel
                      ? `Dit recept wordt toegevoegd aan ${selectedSlotLabel}.`
                      : "Kies eerst dag en maaltijd. Daarna kun je het recept zonder foutmelding toevoegen."}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              {selectorMode === "library" ? (
                <>
                  <div className="space-y-5">
                    <div className="rounded-[24px] border border-dashed border-black/10 bg-white/80 p-4">
                      <p className="text-sm font-medium text-slate-950">
                        Niets passend gevonden voor {getDayLabel(selectedDay)} {selectedMeal ? `• ${getMealTypeLabel(selectedMeal)}` : ""}?
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Voeg meteen je eigen maaltijd of recept handmatig toe.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3 w-full justify-center"
                        onClick={() => setSelectorMode("custom")}
                      >
                        <PencilLine className="mr-2 h-4 w-4" />
                        Eigen invoer toevoegen
                      </Button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={recipeSearch}
                        onChange={(e) => setRecipeSearch(e.target.value)}
                        placeholder="Zoek op chia, ontbijt, reset..."
                        className="pl-10"
                      />
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-950">Snel op type</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={activeMealFilter === null ? "default" : "outline"}
                          onClick={() => setActiveMealFilter(null)}
                        >
                          Alles
                        </Button>
                        {MEAL_TYPES.map((meal) => (
                          <Button
                            key={meal.value}
                            type="button"
                            size="sm"
                            variant={activeMealFilter === meal.value ? "default" : "outline"}
                            onClick={() => setActiveMealFilter((current) => (current === meal.value ? null : meal.value))}
                          >
                            {meal.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-950">Voedingsfilters</p>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_TAG_FILTERS.map((tag) => (
                          <Button
                            key={tag}
                            type="button"
                            size="sm"
                            variant={activeTagFilter === tag ? "default" : "outline"}
                            onClick={() => setActiveTagFilter((current) => (current === tag ? null : tag))}
                          >
                            {tag}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-dashed border-black/10 bg-white/70 p-4 text-sm text-muted-foreground">
                      Zoek op ingredienten zoals <span className="font-medium text-slate-900">chia</span> of filter direct op
                      reset, keto, ontbijt, lunch, avondmaal en snack.
                    </div>
                  </div>

                  <div className="space-y-4 overflow-y-auto">
                    {filteredSavedCustomRecipes.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-950">Jouw opgeslagen recepten</p>
                          <p className="text-sm text-muted-foreground">{filteredSavedCustomRecipes.length} opgeslagen</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {filteredSavedCustomRecipes.map((recipe) => (
                            <button
                              key={recipe.id}
                              type="button"
                              onClick={() => void handleAddSavedCustomRecipe(recipe)}
                              disabled={isSaving || !hasMealSlotSelection(selectedDay, selectedMeal)}
                              className="overflow-hidden rounded-[24px] border border-emerald-100 bg-emerald-50/70 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                            >
                              <div className="relative h-40 bg-emerald-100/60">
                                {recipe.imageUrl ? (
                                  <img
                                    src={recipe.imageUrl}
                                    alt={recipe.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-emerald-700">
                                    <PencilLine className="h-7 w-7" />
                                  </div>
                                )}
                              </div>
                              <div className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="font-semibold text-slate-950">{recipe.title}</p>
                                  <FavoriteRecipeButton
                                    customRecipeId={recipe.id}
                                    initialIsFavorite={Boolean(recipe.isFavorite)}
                                    size="icon"
                                    variant="ghost"
                                  />
                                </div>
                                <p className="mt-1 text-xs text-emerald-700">Opgeslagen in jouw account</p>
                                {recipe.description && (
                                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>
                                )}
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {typeof recipe.calories === "number" && (
                                    <span className="rounded-full bg-white px-2.5 py-1 text-xs text-orange-700">
                                      {recipe.calories} kcal
                                    </span>
                                  )}
                                  {recipe.ingredients?.slice(0, 2).map((ingredient) => (
                                    <span key={`${recipe.id}-${ingredient.name}`} className="rounded-full bg-white px-2.5 py-1 text-xs text-stone-700">
                                      {ingredient.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{filteredRecipes.length} bibliotheekrecepten gevonden</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {filteredRecipes.map((recipe) => (
                        <button
                          key={recipe.id}
                          type="button"
                          onClick={() => void handleAddRecipe(recipe.id)}
                          disabled={isSaving || !hasMealSlotSelection(selectedDay, selectedMeal)}
                          className="overflow-hidden rounded-[24px] border border-white/70 bg-white/88 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                        >
                          <div className="relative h-40 bg-stone-100">
                            {recipe.imageUrl ? (
                              <img
                                src={recipe.imageUrl}
                                alt={recipe.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-muted-foreground">
                                <UtensilsCrossed className="h-7 w-7" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <p className="font-semibold text-slate-950">{recipe.title}</p>
                            {recipe.description && (
                              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                {recipe.description}
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {typeof recipe.calories === "number" && (
                                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs text-orange-700">
                                  {recipe.calories} kcal
                                </span>
                              )}
                              {(recipe.tags ?? []).slice(0, 3).map((tag) => (
                                <span key={tag} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {filteredRecipes.length === 0 && (
                      <div className="rounded-[24px] border border-dashed border-black/10 p-8 text-center text-sm text-muted-foreground">
                        Geen recepten gevonden voor deze combinatie van zoekopdracht en filters.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="lg:col-span-2 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="custom-title">Titel</Label>
                      <Input
                        id="custom-title"
                        value={customEntry.title}
                        onChange={(e) => setCustomEntry((current) => ({ ...current, title: e.target.value }))}
                        placeholder="Bijvoorbeeld: Chia pudding van thuis"
                      />
                    </div>

                    <div className="rounded-[24px] border border-white/70 bg-white/85 p-4">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium text-slate-950">Ingredienten uit database</p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Zoek op basisingredienten zoals chia, kip, rijst of avocado. We stellen meteen een hoeveelheid voor op basis van het klantprofiel.
                      </p>

                      <div className="mt-3 relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={ingredientSearch}
                          onChange={(e) => setIngredientSearch(e.target.value)}
                          placeholder="Zoek ingredienten zoals chia, havermout, kipfilet..."
                          className="pl-10"
                        />
                      </div>

                      {isSearchingIngredients && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Ingredienten zoeken...
                        </div>
                      )}

                      {ingredientResults.length > 0 && (
                        <div className="mt-4 grid gap-3">
                          {ingredientResults.slice(0, 6).map((food) => {
                            const suggestion = suggestQuantityForFood(food, selectedMeal ?? "lunch", healthProfile ?? undefined);
                            const referenceServing = pickReferenceServing(food);
                            return (
                              <button
                                key={food.id}
                                type="button"
                                onClick={() => handleAddIngredient(food)}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-stone-50/80 p-3 text-left transition hover:border-primary/30 hover:bg-white"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-950">
                                    {food.brandName ? `${food.brandName} · ${food.name}` : food.name}
                                  </p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {referenceServing
                                      ? `${referenceServing.calories} kcal • ${referenceServing.protein}g eiwit • ${referenceServing.fiber}g vezels per ${referenceServing.description}`
                                      : "Voedingswaarden beschikbaar"}
                                  </p>
                                </div>
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                                  Voeg toe • {suggestion} g
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="rounded-[24px] border border-white/70 bg-white/85 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-950">Gekozen ingredienten</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            De voorgestelde hoeveelheden zijn een startpunt. De klant kan alles manueel aanpassen.
                          </p>
                        </div>
                        {healthProfile?.calorieTarget ? (
                          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700">
                            Doel {healthProfile.calorieTarget} kcal/dag
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 space-y-3">
                        {ingredientRows.length > 0 ? ingredientRows.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-black/5 bg-stone-50/80 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium text-slate-950">
                                  {item.food.brandName ? `${item.food.brandName} · ${item.food.name}` : item.food.name}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Automatisch voorgesteld voor {selectedMeal ? getMealTypeLabel(selectedMeal).toLowerCase() : "deze maaltijd"}.
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setCustomIngredients((current) => current.filter((ingredient) => ingredient.id !== item.id))
                                }
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-[140px_minmax(0,1fr)]">
                              <div className="space-y-2">
                                <Label>Hoeveelheid (g/ml)</Label>
                                <Input
                                  inputMode="decimal"
                                  value={item.quantityGrams}
                                  onChange={(e) =>
                                    setCustomIngredients((current) =>
                                      current.map((ingredient) =>
                                        ingredient.id === item.id
                                          ? { ...ingredient, quantityGrams: e.target.value }
                                          : ingredient
                                      )
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Referentieportie</Label>
                                <select
                                  value={item.servingId}
                                  onChange={(e) =>
                                    setCustomIngredients((current) =>
                                      current.map((ingredient) =>
                                        ingredient.id === item.id
                                          ? { ...ingredient, servingId: e.target.value }
                                          : ingredient
                                      )
                                    )
                                  }
                                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                  {item.food.servings.map((serving) => (
                                    <option key={serving.id} value={serving.id}>
                                      {serving.description}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full bg-orange-100 px-2.5 py-1 text-orange-700">
                                {Math.round(item.totals.calories)} kcal
                              </span>
                              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700">
                                P {Math.round(item.totals.protein)}g
                              </span>
                              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700">
                                KH {Math.round(item.totals.carbs)}g
                              </span>
                              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700">
                                V {Math.round(item.totals.fat)}g
                              </span>
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
                                Vezels {Math.round(item.totals.fiber)}g
                              </span>
                            </div>
                          </div>
                        )) : (
                          <div className="rounded-2xl border border-dashed border-black/10 p-4 text-sm text-muted-foreground">
                            Zoek hierboven een ingredient zoals chia en voeg het toe om automatisch kcal, macro&apos;s en vezels te berekenen.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="custom-description">Beschrijving</Label>
                      <Textarea
                        id="custom-description"
                        value={customEntry.description}
                        onChange={(e) => setCustomEntry((current) => ({ ...current, description: e.target.value }))}
                        placeholder="Korte notitie of ingrediëntenlijst"
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Foto van maaltijd</Label>
                      <div className="rounded-[24px] border border-white/70 bg-white/80 p-4">
                        {customEntry.imageUrl ? (
                          <div className="space-y-3">
                            <div className="h-48 overflow-hidden rounded-2xl bg-stone-100">
                              <img
                                src={customEntry.imageUrl}
                                alt={customEntry.title || "Eigen recept"}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  const input = document.getElementById(customImageInputId) as HTMLInputElement | null;
                                  input?.click();
                                }}
                                disabled={isUploadingCustomImage}
                              >
                                {isUploadingCustomImage ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="mr-2 h-4 w-4" />
                                )}
                                Andere foto kiezen
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setCustomEntry((current) => ({ ...current, imageUrl: "" }))}
                              >
                                <X className="mr-2 h-4 w-4" />
                                Foto verwijderen
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <ImagePlus className="h-4 w-4" />
                              Op desktop kies je een foto van je computer. Op gsm opent je fotobibliotheek zodat je een maaltijdfoto uit je camerarol kunt toevoegen.
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                const input = document.getElementById(customImageInputId) as HTMLInputElement | null;
                                input?.click();
                              }}
                              disabled={isUploadingCustomImage}
                            >
                              {isUploadingCustomImage ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="mr-2 h-4 w-4" />
                              )}
                              Foto toevoegen
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-white/70 bg-white/80 p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-950">Voedingswaarden</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {autoNutritionEnabled
                              ? "Automatisch berekend op basis van je gekozen ingredienten."
                              : "Handmatig aangepast. Je kan altijd opnieuw auto-berekenen."}
                          </p>
                        </div>
                        {!autoNutritionEnabled && ingredientRows.length > 0 && (
                          <Button type="button" variant="outline" size="sm" onClick={() => setAutoNutritionEnabled(true)}>
                            Gebruik auto-berekening
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="custom-calories">Calorieën</Label>
                          <Input
                            id="custom-calories"
                            inputMode="numeric"
                            value={customEntry.calories}
                            onChange={(e) => setManualNutritionField("calories", e.target.value)}
                            placeholder="450"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="custom-protein">Eiwitten (g)</Label>
                          <Input
                            id="custom-protein"
                            inputMode="numeric"
                            value={customEntry.protein}
                            onChange={(e) => setManualNutritionField("protein", e.target.value)}
                            placeholder="25"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="custom-carbs">Koolhydraten (g)</Label>
                          <Input
                            id="custom-carbs"
                            inputMode="numeric"
                            value={customEntry.carbs}
                            onChange={(e) => setManualNutritionField("carbs", e.target.value)}
                            placeholder="18"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="custom-fat">Vetten (g)</Label>
                          <Input
                            id="custom-fat"
                            inputMode="numeric"
                            value={customEntry.fat}
                            onChange={(e) => setManualNutritionField("fat", e.target.value)}
                            placeholder="20"
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="custom-fiber">Vezels (g)</Label>
                          <Input
                            id="custom-fiber"
                            inputMode="numeric"
                            value={customEntry.fiber}
                            onChange={(e) => setManualNutritionField("fiber", e.target.value)}
                            placeholder="12"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-left">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-950">Opslaan in mijn account</p>
                        <p className="text-xs text-muted-foreground">
                          Bewaar dit eigen recept in je account zodat je het later opnieuw kunt gebruiken.
                        </p>
                      </div>
                      <Switch
                        checked={saveCustomToAccount}
                        onCheckedChange={setSaveCustomToAccount}
                        ariaLabel="Opslaan in mijn account"
                      />
                    </div>

                    <div className="rounded-[24px] border border-dashed border-black/10 bg-white/70 p-4 text-sm text-muted-foreground">
                      Gebruik dit voor maaltijden buiten de receptenbibliotheek, restaurantgerechten of eigen combinaties van de klant.
                    </div>
                  </div>
                </div>
              )}

              <div className="lg:col-span-2 flex flex-col-reverse gap-3 border-t border-black/5 pt-4 sm:flex-row sm:justify-between">
                <Button variant="outline" onClick={closeSelector}>
                  Annuleren
                </Button>
                {selectorMode === "custom" ? (
                  <Button
                    type="button"
                    onClick={() => void handleSaveCustomEntry()}
                    disabled={isSaving || !hasMealSlotSelection(selectedDay, selectedMeal)}
                  >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Eigen recept toevoegen
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setSelectorMode("custom")}>
                    <PencilLine className="mr-2 h-4 w-4" />
                    Ga naar eigen invoer
                  </Button>
                )}
              </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
