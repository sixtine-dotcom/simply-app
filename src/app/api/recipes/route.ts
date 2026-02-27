import { NextRequest, NextResponse } from "next/server";
import { getRecipes } from "@/lib/recipes";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = parseInt(searchParams.get("limit") || "100");

    const recipes = await getRecipes({
      category,
      tag,
      search,
      limit,
    });

    return NextResponse.json(recipes);
  } catch (error) {
    console.error("Get recipes error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
