import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getRecipes, getRecipeCategories, getRecipeTags } from "@/lib/recipes";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Search, ShoppingCart, Calendar } from "lucide-react";
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
    <div className="p-4 md:p-6 lg:p-8">
      <div className="app-panel app-halo mb-8 overflow-hidden">
        <p className="app-kicker">Recipe library</p>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-slate-950 md:text-5xl">
          Recepten
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Gezonde en lekkere recepten voor elke dag
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Button asChild variant="outline" className="h-auto rounded-[26px] border-white/80 bg-white/80 py-4 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.24)] backdrop-blur">
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
        <Button asChild variant="outline" className="h-auto rounded-[26px] border-white/80 bg-white/80 py-4 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.24)] backdrop-blur">
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
        <Card className="app-halo">
          <CardContent className="py-12 text-center">
            <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h2 className="mt-4 font-display text-xl tracking-tight">
              Geen recepten gevonden
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
