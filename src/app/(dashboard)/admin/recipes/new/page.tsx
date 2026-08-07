"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Loader2, Plus, Trash2 } from "lucide-react";

type IngredientRow = {
  ingredient: string;
  amount: string;
  unit: string;
};

type InstructionRow = {
  step: number;
  text: string;
};

export default function NewRecipePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [servings, setServings] = useState("2");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { ingredient: "", amount: "", unit: "" },
  ]);
  const [instructions, setInstructions] = useState<InstructionRow[]>([
    { step: 1, text: "" },
  ]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug || slug === value.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim()
      );
    }
  };

  const addIngredient = () => {
    setIngredients((prev) => [...prev, { ingredient: "", amount: "", unit: "" }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const addInstruction = () => {
    setInstructions((prev) => [...prev, { step: prev.length + 1, text: "" }]);
  };

  const removeInstruction = (index: number) => {
    setInstructions((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, step: i + 1 }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const filteredIngredients = ingredients
        .map((row) => ({
          ingredient: row.ingredient.trim(),
          amount: row.amount.trim() || undefined,
          unit: row.unit.trim() || undefined,
        }))
        .filter((row) => row.ingredient.length > 0);

      const filteredInstructions = instructions
        .map((row, index) => ({
          step: index + 1,
          text: row.text.trim(),
        }))
        .filter((row) => row.text.length > 0);

      if (filteredIngredients.length === 0) {
        throw new Error("Voeg minimaal 1 ingrediënt toe");
      }
      if (filteredInstructions.length === 0) {
        throw new Error("Voeg minimaal 1 bereidingsstap toe");
      }

      const response = await fetch("/api/admin/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || undefined,
          description: description.trim() || null,
          imageUrl: imageUrl.trim() || null,
          category: category.trim() || null,
          tags: tagsInput
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          calories: calories.trim() ? Number(calories) : null,
          protein: protein.trim() ? Number(protein) : null,
          carbs: carbs.trim() ? Number(carbs) : null,
          fat: fat.trim() ? Number(fat) : null,
          servings: Number(servings) || 2,
          prepTime: prepTime.trim() ? Number(prepTime) : null,
          cookTime: cookTime.trim() ? Number(cookTime) : null,
          ingredients: filteredIngredients,
          instructions: filteredInstructions,
          isPublished,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Recept opslaan mislukt");

      toast({
        title: "Recept aangemaakt",
        description: `${data.title} is opgeslagen.`,
      });
      router.push("/admin/recipes");
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon recept niet opslaan",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-4xl">
      <Link
        href="/admin/recipes"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar recepten
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl tracking-wider">
            NIEUW RECEPT
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categorie</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="bijv. Ontbijt"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Beschrijving</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[90px]"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="imageUrl">Afbeeldings-URL</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="tags">Tags (komma-gescheiden)</Label>
                <Input
                  id="tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="glutenvrij, snel, vegetarisch"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="calories">Kcal</Label>
                <Input
                  id="calories"
                  type="number"
                  min={0}
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein">Eiwit (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  min={0}
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs">Koolhydraten (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  min={0}
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fat">Vet (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  min={0}
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="servings">Porties</Label>
                <Input
                  id="servings"
                  type="number"
                  min={1}
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prepTime">Voorbereiding (min)</Label>
                <Input
                  id="prepTime"
                  type="number"
                  min={0}
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cookTime">Kooktijd (min)</Label>
                <Input
                  id="cookTime"
                  type="number"
                  min={0}
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Publicatie</Label>
                <div className="h-10 flex items-center gap-2">
                  <input
                    id="isPublished"
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="isPublished" className="text-sm font-normal">
                    Meteen publiceren
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Ingrediënten *</h3>
                <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ingrediënt
                </Button>
              </div>
              <div className="space-y-2">
                {ingredients.map((row, index) => (
                  <div key={index} className="grid gap-2 grid-cols-12">
                    <Input
                      className="col-span-6"
                      placeholder="Ingrediënt"
                      value={row.ingredient}
                      onChange={(e) =>
                        setIngredients((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, ingredient: e.target.value } : r
                          )
                        )
                      }
                    />
                    <Input
                      className="col-span-2"
                      placeholder="Aantal"
                      value={row.amount}
                      onChange={(e) =>
                        setIngredients((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, amount: e.target.value } : r
                          )
                        )
                      }
                    />
                    <Input
                      className="col-span-3"
                      placeholder="Eenheid"
                      value={row.unit}
                      onChange={(e) =>
                        setIngredients((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, unit: e.target.value } : r
                          )
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="col-span-1"
                      onClick={() => removeIngredient(index)}
                      disabled={ingredients.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-error" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Bereiding *</h3>
                <Button type="button" variant="outline" size="sm" onClick={addInstruction}>
                  <Plus className="h-4 w-4 mr-1" />
                  Stap
                </Button>
              </div>
              <div className="space-y-2">
                {instructions.map((row, index) => (
                  <div key={index} className="grid gap-2 grid-cols-12">
                    <Input className="col-span-1" value={row.step} disabled />
                    <Input
                      className="col-span-10"
                      placeholder="Beschrijf de stap"
                      value={row.text}
                      onChange={(e) =>
                        setInstructions((prev) =>
                          prev.map((r, i) =>
                            i === index ? { ...r, text: e.target.value } : r
                          )
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="col-span-1"
                      onClick={() => removeInstruction(index)}
                      disabled={instructions.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-error" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Opslaan...
                  </>
                ) : (
                  "Recept opslaan"
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/recipes">Annuleren</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
