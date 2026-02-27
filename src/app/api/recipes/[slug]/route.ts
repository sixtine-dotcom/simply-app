import { NextRequest, NextResponse } from "next/server";
import { getRecipeBySlug } from "@/lib/recipes";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const recipe = await getRecipeBySlug(slug);

    if (!recipe) {
      return NextResponse.json(
        { error: "Recept niet gevonden" },
        { status: 404 }
      );
    }

    return NextResponse.json(recipe);
  } catch (error) {
    console.error("Get recipe error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
