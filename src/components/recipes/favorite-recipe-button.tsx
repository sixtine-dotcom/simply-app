"use client";

import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface FavoriteRecipeButtonProps {
  recipeId?: string | null;
  customRecipeId?: string | null;
  initialIsFavorite?: boolean;
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "default" | "icon";
}

export function FavoriteRecipeButton({
  recipeId,
  customRecipeId,
  initialIsFavorite = false,
  variant = "outline",
  size = "sm",
}: FavoriteRecipeButtonProps) {
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isLoading, setIsLoading] = useState(false);

  async function handleToggle() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/recipes/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: recipeId ?? null,
          customRecipeId: customRecipeId ?? null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon favoriet niet aanpassen");
      }

      setIsFavorite(Boolean(data.isFavorite));
      toast({
        title: data.isFavorite ? "Toegevoegd aan favorieten" : "Verwijderd uit favorieten",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon favoriet niet aanpassen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void handleToggle();
      }}
      aria-label={isFavorite ? "Verwijder uit favorieten" : "Voeg toe aan favorieten"}
      className={isFavorite ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : undefined}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
      )}
      {size !== "icon" ? <span className="ml-2">{isFavorite ? "Favoriet" : "Bewaar"}</span> : null}
    </Button>
  );
}
