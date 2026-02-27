import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getRecipesForAdmin } from "@/lib/recipes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Download, UtensilsCrossed } from "lucide-react";
import { RecipeCard } from "@/components/recipes/recipe-card";

export default async function AdminRecipesPage() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const recipes = await getRecipesForAdmin({ limit: 100 });

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl tracking-wider">
            RECEPTEN BEHEER
          </h1>
          <p className="mt-2 text-muted-foreground">
            Beheer alle recepten
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/recipes/import">
              <Download className="mr-2 h-4 w-4" />
              Importeren
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/recipes/new">
              <Plus className="mr-2 h-4 w-4" />
              Nieuw recept
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{recipes.length}</p>
              <p className="text-sm text-muted-foreground">Totaal recepten</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {recipes.filter((r) => r.isPublished).length}
              </p>
              <p className="text-sm text-muted-foreground">Gepubliceerd</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {recipes.filter((r) => !r.isPublished).length}
              </p>
              <p className="text-sm text-muted-foreground">Concept</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recipes List */}
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
              GEEN RECEPTEN
            </h2>
            <p className="mt-2 text-muted-foreground">
              Importeer recepten van je website of maak een nieuw recept aan.
            </p>
            <div className="flex gap-4 justify-center mt-4">
              <Button variant="outline" asChild>
                <Link href="/admin/recipes/import">
                  <Download className="mr-2 h-4 w-4" />
                  Importeren
                </Link>
              </Button>
              <Button asChild>
                <Link href="/admin/recipes/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Nieuw recept
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
