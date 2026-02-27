"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface AddToMealPlanProps {
  recipeId: string;
  recipeTitle: string;
}

export function AddToMealPlan({ recipeId, recipeTitle }: AddToMealPlanProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      // For now, just redirect to meal plan page
      // In a full implementation, you'd open a modal to select day/meal
      router.push(`/recipes/meal-plan?addRecipe=${recipeId}`);
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon niet toevoegen aan weekmenu",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Button
      onClick={handleAdd}
      disabled={isAdding}
      variant="outline"
      className="w-full"
    >
      {isAdding ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Calendar className="h-4 w-4 mr-2" />
      )}
      Toevoegen aan weekmenu
    </Button>
  );
}
