import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { syncRecipesFromWebsite } from "@/lib/shopify-recipes";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const result = await syncRecipesFromWebsite();

    await createAuditLog("recipe.import", user.id, {
      imported: result.imported,
      updated: result.updated,
      errors: result.errors,
    });

    return NextResponse.json({
      success: true,
      imported: result.imported,
      updated: result.updated,
      errors: result.errors,
      importedRecipes: result.importedTitles,
      updatedRecipes: result.updatedTitles,
      errorRecipes: result.errorTitles,
    });
  } catch (error) {
    console.error("Import recipes error:", error);
    return NextResponse.json(
      {
        error: "Er is iets misgegaan",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
