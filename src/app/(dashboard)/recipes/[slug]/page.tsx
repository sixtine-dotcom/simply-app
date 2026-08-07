import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getRecipeBySlug } from "@/lib/recipes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Clock, UtensilsCrossed, ShoppingCart, Calendar } from "lucide-react";
import { AddToGroceryList } from "@/components/recipes/add-to-grocery-list";
import { AddToMealPlan } from "@/components/recipes/add-to-meal-plan";
import { FavoriteRecipeButton } from "@/components/recipes/favorite-recipe-button";
import { db } from "@/lib/db";
import { getRecipeImagePresentation } from "@/lib/recipe-image-presentation";

interface RecipePageProps {
  params: Promise<{ slug: string }>;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  const recipe = await getRecipeBySlug(slug);

  if (!recipe) {
    notFound();
  }

  const ingredients = recipe.ingredients as any[];
  const instructions = recipe.instructions as any[];
  const favorite = await db.userFavoriteRecipe.findUnique({
    where: {
      userId_recipeId: {
        userId: user.id,
        recipeId: recipe.id,
      },
    },
  });
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  const imageSrc = recipe.imageUrl
    ? `${recipe.imageUrl}${recipe.updatedAt ? `?v=${new Date(recipe.updatedAt).getTime()}` : ""}`
    : null;
  const imagePresentation = getRecipeImagePresentation(recipe.slug, recipe.imageUrl);

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6 lg:p-8">
      <Link 
        href="/recipes"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar recepten
      </Link>

      <div className="app-panel app-halo mb-8 overflow-hidden">
        <p className="app-kicker">Recipe detail</p>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-slate-950 md:text-5xl">
          {recipe.title}
        </h1>
        {recipe.description && (
          <p className="mt-3 max-w-3xl text-muted-foreground">{recipe.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {imageSrc && (
            <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white p-3 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
              <img
                src={imageSrc}
                alt={recipe.title}
                className="mx-auto max-h-[70vh] w-full rounded-[20px] object-contain"
                style={
                  imagePresentation.isPdfRecipeImage
                    ? {
                        clipPath: imagePresentation.detailClipPath,
                        objectPosition: imagePresentation.objectPosition,
                      }
                    : undefined
                }
              />
            </div>
          )}

          <Card className="app-halo">
            <CardContent className="p-6">
              <h2 className="mb-4 font-display text-xl tracking-tight">
                Ingrediënten
              </h2>
              <ul className="space-y-2">
                {ingredients.map((ing, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>
                      {ing.amount && <span className="font-medium">{ing.amount} </span>}
                      {ing.unit && <span>{ing.unit} </span>}
                      {ing.ingredient}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="app-halo">
            <CardContent className="p-6">
              <h2 className="mb-4 font-display text-xl tracking-tight">
                Bereiding
              </h2>
              <ol className="space-y-4">
                {instructions.map((inst, idx) => (
                  <li key={idx} className="flex gap-4">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                      {inst.step || idx + 1}
                    </span>
                    <span className="flex-1">{inst.text}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="app-halo">
            <CardContent className="p-6">
              <h3 className="mb-4 font-display text-lg tracking-tight">
                Informatie
              </h3>

              <div className="space-y-3">
                {totalTime > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Bereidingstijd: </span>
                    <span className="font-medium">{totalTime} min</span>
                  </div>
                )}

                {recipe.prepTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Voorbereiding: </span>
                    <span className="font-medium">{recipe.prepTime} min</span>
                  </div>
                )}

                {recipe.cookTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Kooktijd: </span>
                    <span className="font-medium">{recipe.cookTime} min</span>
                  </div>
                )}

                {recipe.servings > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Porties: </span>
                    <span className="font-medium">{recipe.servings}</span>
                  </div>
                )}
              </div>

              {/* Nutrition Info */}
              {(recipe.calories || recipe.protein) && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-sm mb-2">Voedingswaarden (per portie)</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {recipe.calories && (
                      <div>
                        <span className="text-muted-foreground">Kcal: </span>
                        <span className="font-medium">{recipe.calories}</span>
                      </div>
                    )}
                    {recipe.protein && (
                      <div>
                        <span className="text-muted-foreground">Eiwit: </span>
                        <span className="font-medium">{recipe.protein}g</span>
                      </div>
                    )}
                    {recipe.carbs && (
                      <div>
                        <span className="text-muted-foreground">Koolhydraten: </span>
                        <span className="font-medium">{recipe.carbs}g</span>
                      </div>
                    )}
                    {recipe.fat && (
                      <div>
                        <span className="text-muted-foreground">Vet: </span>
                        <span className="font-medium">{recipe.fat}g</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {recipe.tags.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex flex-wrap gap-2">
                    {recipe.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="app-halo">
            <CardContent className="p-6 space-y-3">
              <FavoriteRecipeButton recipeId={recipe.id} initialIsFavorite={Boolean(favorite)} />
              <AddToGroceryList recipeId={recipe.id} recipeTitle={recipe.title} />
              <AddToMealPlan recipeId={recipe.id} recipeTitle={recipe.title} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
