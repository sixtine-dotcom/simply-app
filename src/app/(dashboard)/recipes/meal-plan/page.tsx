"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Calendar, ChevronRight, Plus, X, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

const DAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
const MEAL_TYPES = [
  { value: "breakfast", label: "Ontbijt" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Avondeten" },
  { value: "snack", label: "Snack" },
];

export default function MealPlanPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const addRecipeId = searchParams.get("addRecipe");

  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split("T")[0];
  });

  const [mealPlan, setMealPlan] = useState<any | null>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);

  useEffect(() => {
    loadMealPlan();
    loadRecipes();
  }, [weekStart]);

  useEffect(() => {
    if (addRecipeId) {
      // Open selector for adding this recipe
      setShowRecipeSelector(true);
      // You could pre-select the recipe here
    }
  }, [addRecipeId]);

  const loadMealPlan = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/recipes/meal-plan?weekStart=${weekStart}`);
      if (response.ok) {
        const data = await response.json();
        setMealPlan(data);
      }
    } catch (error) {
      console.error("Failed to load meal plan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecipes = async () => {
    try {
      const response = await fetch("/api/recipes?limit=100");
      if (response.ok) {
        const data = await response.json();
        setRecipes(data);
      }
    } catch (error) {
      console.error("Failed to load recipes:", error);
    }
  };

  const changeWeek = (direction: "prev" | "next") => {
    const current = new Date(weekStart);
    current.setDate(current.getDate() + (direction === "next" ? 7 : -7));
    setWeekStart(current.toISOString().split("T")[0]);
  };

  const handleAddRecipe = async (recipeId: string) => {
    if (selectedDay === null || !selectedMeal) {
      toast({
        title: "Fout",
        description: "Selecteer eerst een dag en maaltijd",
        variant: "destructive",
      });
      return;
    }

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

      if (!response.ok) {
        throw new Error("Kon recept niet toevoegen");
      }

      setShowRecipeSelector(false);
      setSelectedDay(null);
      setSelectedMeal(null);
      loadMealPlan();

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
    }
  };

  const handleRemoveRecipe = async (itemId: string) => {
    try {
      const response = await fetch(`/api/recipes/meal-plan?itemId=${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Kon recept niet verwijderen");
      }

      loadMealPlan();
      toast({
        title: "Verwijderd",
        description: "Recept is verwijderd uit je weekmenu.",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon recept niet verwijderen",
        variant: "destructive",
      });
    }
  };

  const getMealForDay = (dayOfWeek: number, mealType: string) => {
    if (!mealPlan) return null;
    return mealPlan.items.find(
      (item: any) => item.dayOfWeek === dayOfWeek && item.mealType === mealType
    );
  };

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <Link 
        href="/recipes"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar recepten
      </Link>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-2xl md:text-3xl tracking-wider flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            WEEKMENU
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => changeWeek("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[200px] text-center">
              {new Date(weekStart).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <Button variant="outline" size="sm" onClick={() => changeWeek("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left p-2 font-display text-sm tracking-wider">Dag</th>
                    {MEAL_TYPES.map((meal) => (
                      <th key={meal.value} className="text-left p-2 font-display text-sm tracking-wider">
                        {meal.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, dayIndex) => (
                    <tr key={day} className="border-t">
                      <td className="p-3 font-medium">{day}</td>
                      {MEAL_TYPES.map((meal) => {
                        const mealItem = getMealForDay(dayIndex, meal.value);
                        return (
                          <td key={meal.value} className="p-3">
                            {mealItem ? (
                              <div className="flex items-center justify-between gap-2 p-2 bg-muted rounded">
                                <Link
                                  href={`/recipes/${mealItem.recipe.slug}`}
                                  className="text-sm hover:text-primary flex-1"
                                >
                                  {mealItem.recipe.title}
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveRecipe(mealItem.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedDay(dayIndex);
                                  setSelectedMeal(meal.value);
                                  setShowRecipeSelector(true);
                                }}
                                className="w-full h-10 text-muted-foreground hover:text-foreground"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Toevoegen
                              </Button>
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

      {/* Recipe Selector Modal */}
      {showRecipeSelector && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="font-display text-lg tracking-wider">
                Selecteer Recept
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => handleAddRecipe(recipe.id)}
                    className="w-full text-left p-3 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <p className="font-medium">{recipe.title}</p>
                    {recipe.calories && (
                      <p className="text-xs text-muted-foreground">
                        {recipe.calories} kcal
                      </p>
                    )}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => {
                  setShowRecipeSelector(false);
                  setSelectedDay(null);
                  setSelectedMeal(null);
                }}
              >
                Annuleren
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
