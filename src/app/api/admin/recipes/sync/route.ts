import { NextResponse } from "next/server";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { syncRecipesFromWebsite } from "@/lib/shopify-recipes";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  try {
    const result = await syncRecipesFromWebsite();

    await createAuditLog("recipe.sync", user.id, {
      imported: result.imported,
      updated: result.updated,
      errors: result.errors,
    });

    return NextResponse.json({
      ok: true,
      created: result.imported,
      updated: result.updated,
      errors: result.errors,
      total: result.imported + result.updated + result.errors,
      importedRecipes: result.importedTitles,
      updatedRecipes: result.updatedTitles,
      errorRecipes: result.errorTitles,
    });
  } catch (error) {
    console.error("Recipe sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync mislukt" },
      { status: 500 }
    );
  }
}
