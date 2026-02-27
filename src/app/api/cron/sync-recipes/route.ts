import { NextRequest, NextResponse } from "next/server";
import { syncRecipesFromWebsite } from "@/lib/shopify-recipes";

/**
 * Cron: sync recipes from configured website (RECIPES_SOURCE_URL of simplyinbalance.com/blogs/recepten).
 * Roep periodiek aan (bijv. elk uur of dagelijks) zodat nieuwe recepten automatisch in de app staan.
 * GET /api/cron/sync-recipes?secret=JOUW_CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get("secret");
    const expected = process.env.CRON_SECRET;
    if (expected && secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncRecipesFromWebsite();

    return NextResponse.json({
      ok: true,
      imported: result.imported,
      updated: result.updated,
      errors: result.errors,
      message: `${result.imported} nieuw, ${result.updated} bijgewerkt${result.errors ? `, ${result.errors} fout(en)` : ""}.`,
    });
  } catch (error) {
    console.error("Sync recipes cron error:", error);
    return NextResponse.json(
      {
        error: "Sync mislukt",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
