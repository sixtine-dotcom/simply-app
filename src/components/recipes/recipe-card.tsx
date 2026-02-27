import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, UtensilsCrossed } from "lucide-react";
import { RecipeWithDetails } from "@/lib/recipes";

interface RecipeCardProps {
  recipe: RecipeWithDetails;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  return (
    <Link href={`/recipes/${recipe.slug}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        {recipe.imageUrl && (
          <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="object-cover w-full h-full"
            />
          </div>
        )}
        <CardContent className="p-5">
          <h3 className="font-display text-lg tracking-wider mb-2">
            {recipe.title}
          </h3>
          {recipe.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {recipe.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            {totalTime > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{totalTime} min</span>
              </div>
            )}
            {recipe.servings > 0 && (
              <div className="flex items-center gap-1">
                <UtensilsCrossed className="h-4 w-4" />
                <span>{recipe.servings} personen</span>
              </div>
            )}
          </div>

          {recipe.calories && (
            <div className="flex items-center gap-4 text-xs">
              <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">
                {recipe.calories} kcal
              </span>
              {recipe.protein && (
                <span className="text-muted-foreground">
                  {recipe.protein}g eiwit
                </span>
              )}
            </div>
          )}

          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {recipe.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
