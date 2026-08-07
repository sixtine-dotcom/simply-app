import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeRecipeTags } from "@/lib/recipe-tags";

const createRecipeSchema = z.object({
  title: z.string().min(1, "Titel is verplicht"),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().url("Afbeeldings-URL is ongeldig").nullable().optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  calories: z.number().int().nullable().optional(),
  protein: z.number().int().nullable().optional(),
  carbs: z.number().int().nullable().optional(),
  fat: z.number().int().nullable().optional(),
  servings: z.number().int().min(1).optional(),
  prepTime: z.number().int().min(0).nullable().optional(),
  cookTime: z.number().int().min(0).nullable().optional(),
  ingredients: z.array(
    z.object({
      ingredient: z.string().min(1),
      amount: z.string().optional(),
      unit: z.string().optional(),
    })
  ),
  instructions: z.array(
    z.object({
      step: z.number().int().min(1),
      text: z.string().min(1),
    })
  ),
  isPublished: z.boolean().optional(),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = await request.json();
    const data = createRecipeSchema.parse(body);

    const baseSlug = data.slug?.trim() ? slugify(data.slug) : slugify(data.title);
    if (!baseSlug) {
      return NextResponse.json({ error: "Slug is ongeldig" }, { status: 400 });
    }

    let slug = baseSlug;
    let suffix = 2;
    // Ensure unique slug
    while (await db.recipe.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    const recipe = await db.recipe.create({
      data: {
        title: data.title.trim(),
        slug,
        description: data.description?.trim() || null,
        imageUrl: data.imageUrl || null,
        category: data.category?.trim() || null,
        tags: normalizeRecipeTags({
          title: data.title.trim(),
          description: data.description?.trim() || null,
          tags: (data.tags || []).map((tag) => tag.trim()).filter((tag) => tag.length > 0),
          ingredients: data.ingredients,
          carbs: data.carbs ?? null,
        }),
        calories: data.calories ?? null,
        protein: data.protein ?? null,
        carbs: data.carbs ?? null,
        fat: data.fat ?? null,
        servings: data.servings ?? 2,
        prepTime: data.prepTime ?? null,
        cookTime: data.cookTime ?? null,
        ingredients: data.ingredients,
        instructions: data.instructions,
        isPublished: data.isPublished ?? false,
      },
    });

    await createAuditLog("recipe.created", user.id, {
      recipeId: recipe.id,
      title: recipe.title,
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Create recipe error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
