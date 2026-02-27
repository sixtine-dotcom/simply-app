/**
 * Import recipes from website (Shopify blog)
 * Blog URL: RECIPES_SOURCE_URL of default simplyinbalance.com/blogs/recepten
 */

const RECIPES_BASE_URL =
  process.env.RECIPES_SOURCE_URL || "https://simplyinbalance.com/blogs/recepten";

interface ShopifyRecipe {
  title: string;
  url: string;
  description: string;
  tags: string[];
  content: string;
  imageUrl?: string;
}

/**
 * Fetch recipes from the configured blog URL
 */
export async function fetchShopifyRecipes(): Promise<ShopifyRecipe[]> {
  try {
    const baseUrl = RECIPES_BASE_URL.replace(/\/$/, "");
    const blogPath = baseUrl.includes("/blogs/") ? baseUrl : `${baseUrl}/blogs/recepten`;
    const response = await fetch(blogPath, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch recipes: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Parse HTML to extract recipe links
    const recipeLinks: string[] = [];
    const origin = new URL(blogPath).origin;
    const linkRegex = /href="(\/blogs\/recepten\/[^"]+)"|href="(https?:\/\/[^"]*\/blogs\/recepten\/[^"]+)"/g;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const pathOrFull = match[1] || match[2];
      const url = pathOrFull.startsWith("http") ? pathOrFull : `${origin}${pathOrFull}`;
      if (!recipeLinks.includes(url)) {
        recipeLinks.push(url);
      }
    }

    const recipes: ShopifyRecipe[] = [];

    for (const recipeUrl of recipeLinks) {
      try {
        const recipeResponse = await fetch(recipeUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0",
          },
        });

        if (recipeResponse.ok) {
          const recipeHtml = await recipeResponse.text();
          const recipe = parseRecipeFromHTML(recipeHtml, recipeUrl);
          if (recipe) {
            recipes.push(recipe);
          }
        }
      } catch (error) {
        console.error(`Failed to fetch recipe ${recipeUrl}:`, error);
      }
    }

    return recipes;
  } catch (error) {
    console.error("Failed to fetch Shopify recipes:", error);
    throw error;
  }
}

/**
 * Parse recipe data from HTML
 */
function parseRecipeFromHTML(html: string, url: string): ShopifyRecipe | null {
  try {
    // Extract title (usually in h1 or article title)
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || 
                      html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/\s*-\s*Simply in Balance.*/i, "").trim() : "";

    if (!title) return null;

    // Extract description (meta description or first paragraph)
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) ||
                      html.match(/<p[^>]*class="[^"]*excerpt[^"]*"[^>]*>([^<]+)<\/p>/i);
    const description = descMatch ? descMatch[1].trim() : "";

    // Extract tags (if present in meta tags or article tags)
    const tags: string[] = [];
    const tagMatches = Array.from(html.matchAll(/<a[^>]*href="[^"]*\/tagged\/([^"]+)"[^>]*>([^<]+)<\/a>/gi));
    for (const match of tagMatches) {
      tags.push(match[2].trim());
    }

    // Extract image (og:image or first img in article)
    const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
                       html.match(/<img[^>]*class="[^"]*article[^"]*"[^>]*src="([^"]+)"/i);
    const imageUrl = imageMatch ? imageMatch[1] : undefined;

    // Extract content (article body)
    const contentMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                        html.match(/<div[^>]*class="[^"]*article[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const content = contentMatch ? contentMatch[1] : "";

    return {
      title,
      url,
      description,
      tags,
      content,
      imageUrl,
    };
  } catch (error) {
    console.error("Failed to parse recipe:", error);
    return null;
  }
}

/**
 * Convert Shopify recipe to our Recipe format
 */
export function convertShopifyRecipeToRecipe(shopifyRecipe: ShopifyRecipe): {
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  ingredients: any[];
  instructions: any[];
  category: string | null;
  tags: string[];
} {
  // Generate slug from title
  const slug = shopifyRecipe.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  // Parse ingredients and instructions from content
  const { ingredients, instructions } = parseRecipeContent(shopifyRecipe.content);

  // Determine category from tags
  const categoryMap: Record<string, string> = {
    ontbijt: "ontbijt",
    lunch: "lunch",
    avondmaal: "diner",
    snack: "snack",
    shake: "snack",
  };

  let category: string | null = null;
  for (const tag of shopifyRecipe.tags) {
    const lowerTag = tag.toLowerCase();
    if (categoryMap[lowerTag]) {
      category = categoryMap[lowerTag];
      break;
    }
  }

  return {
    title: shopifyRecipe.title,
    slug,
    description: shopifyRecipe.description || null,
    imageUrl: shopifyRecipe.imageUrl || null,
    ingredients,
    instructions,
    category,
    tags: shopifyRecipe.tags,
  };
}

/**
 * Parse ingredients and instructions from HTML content
 */
function parseRecipeContent(html: string): {
  ingredients: any[];
  instructions: any[];
} {
  const ingredients: any[] = [];
  const instructions: any[] = [];

  // Remove HTML tags for parsing
  const textContent = html
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

  const lines = textContent.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);

  let inIngredients = false;
  let inInstructions = false;
  let stepNumber = 1;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Detect ingredients section
    if (lowerLine.includes("ingrediënten") || lowerLine.includes("benodigdheden") || lowerLine.includes("wat heb je nodig")) {
      inIngredients = true;
      inInstructions = false;
      continue;
    }

    // Detect instructions section
    if (lowerLine.includes("bereiding") || lowerLine.includes("hoe maak je") || lowerLine.includes("instructies")) {
      inInstructions = true;
      inIngredients = false;
      continue;
    }

    // Parse ingredients
    if (inIngredients && !inInstructions) {
      // Try to parse "amount unit ingredient" or "ingredient"
      const ingredientMatch = line.match(/^(\d+[.,]?\d*)?\s*([a-z]+)?\s*(.+)$/i);
      if (ingredientMatch) {
        ingredients.push({
          amount: ingredientMatch[1] || "",
          unit: ingredientMatch[2] || "",
          ingredient: ingredientMatch[3] || line,
        });
      } else {
        ingredients.push({
          amount: "",
          unit: "",
          ingredient: line,
        });
      }
    }

    // Parse instructions
    if (inInstructions) {
      // Remove step numbers if present
      const cleanLine = line.replace(/^\d+[.)]\s*/, "");
      if (cleanLine.length > 0) {
        instructions.push({
          step: stepNumber++,
          text: cleanLine,
        });
      }
    }
  }

  return { ingredients, instructions };
}

/**
 * Sync recipes from the configured website: fetch all and upsert in DB.
 * Returns counts for imported, updated, and errors.
 */
export async function syncRecipesFromWebsite(): Promise<{
  imported: number;
  updated: number;
  errors: number;
  importedTitles: string[];
  updatedTitles: string[];
  errorTitles: string[];
}> {
  const { db } = await import("@/lib/db");
  const shopifyRecipes = await fetchShopifyRecipes();
  const importedTitles: string[] = [];
  const updatedTitles: string[] = [];
  const errorTitles: string[] = [];

  for (const shopifyRecipe of shopifyRecipes) {
    try {
      const recipeData = convertShopifyRecipeToRecipe(shopifyRecipe);
      const existing = await db.recipe.findUnique({
        where: { slug: recipeData.slug },
      });

      if (existing) {
        await db.recipe.update({
          where: { slug: recipeData.slug },
          data: {
            ...recipeData,
            isPublished: true,
          },
        });
        updatedTitles.push(recipeData.title);
      } else {
        await db.recipe.create({
          data: {
            ...recipeData,
            isPublished: true,
          },
        });
        importedTitles.push(recipeData.title);
      }
    } catch (error) {
      console.error(`Sync recipe ${shopifyRecipe.title}:`, error);
      errorTitles.push(shopifyRecipe.title);
    }
  }

  return {
    imported: importedTitles.length,
    updated: updatedTitles.length,
    errors: errorTitles.length,
    importedTitles,
    updatedTitles,
    errorTitles,
  };
}
