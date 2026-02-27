"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ShoppingCart, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface AddToGroceryListProps {
  recipeId: string;
  recipeTitle: string;
}

export function AddToGroceryList({ recipeId, recipeTitle }: AddToGroceryListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      const response = await fetch("/api/recipes/grocery-list/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      });

      if (!response.ok) {
        throw new Error("Kon niet toevoegen aan boodschappenlijst");
      }

      toast({
        title: "Toegevoegd",
        description: `${recipeTitle} is toegevoegd aan je boodschappenlijst.`,
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon niet toevoegen",
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
        <ShoppingCart className="h-4 w-4 mr-2" />
      )}
      Toevoegen aan boodschappenlijst
    </Button>
  );
}
