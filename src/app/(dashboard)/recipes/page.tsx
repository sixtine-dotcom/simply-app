import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getRecipes, getRecipeCategories, getRecipeTags } from "@/lib/recipes";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Search, ShoppingCart, Calendar, FileText } from "lucide-react";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { RecipeFilters } from "@/components/recipes/recipe-filters";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tag?: string; search?: string }>;
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const [recipes, categories, tags] = await Promise.all([
    getRecipes({
      category: params.category,
      tag: params.tag,
      search: params.search,
    }),
    getRecipeCategories(),
    getRecipeTags(),
  ]);

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl tracking-wider">
          RECEPTEN
        </h1>
        <p className="mt-2 text-muted-foreground">
          Gezonde en lekkere recepten voor elke dag
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Button asChild variant="outline" className="h-auto py-4">
          <Link href="/recipes/grocery-list">
            <ShoppingCart className="h-5 w-5 mr-2" />
            <div className="text-left">
              <div className="font-medium">Boodschappenlijst</div>
              <div className="text-sm text-muted-foreground">
                Genereer lijst van recepten
              </div>
            </div>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4">
          <Link href="/recipes/meal-plan">
            <Calendar className="h-5 w-5 mr-2" />
            <div className="text-left">
              <div className="font-medium">Weekmenu</div>
              <div className="text-sm text-muted-foreground">
                Plan je weekmenu
              </div>
            </div>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4">
          <Link href="/recipes/nutrition-plan">
            <FileText className="h-5 w-5 mr-2" />
            <div className="text-left">
              <div className="font-medium">Voedingsschema</div>
              <div className="text-sm text-muted-foreground">
                Download je schema
              </div>
            </div>
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <RecipeFilters categories={categories} tags={tags} />

      {/* Recipes Grid */}
      {recipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h2 className="mt-4 font-display text-xl tracking-wider">
              GEEN RECEPTEN GEVONDEN
            </h2>
            <p className="mt-2 text-muted-foreground">
              Probeer andere filters of zoektermen.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
