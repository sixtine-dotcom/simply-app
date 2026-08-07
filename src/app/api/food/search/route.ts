import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchOpenFoodFactsFoods } from "@/lib/open-food-facts";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const query = request.nextUrl.searchParams.get("q")?.trim();
    const region = request.nextUrl.searchParams.get("region") || "BE";
    const language = request.nextUrl.searchParams.get("language") || "nl";

    if (!query) {
      return NextResponse.json({ error: "Zoekterm ontbreekt" }, { status: 400 });
    }

    const foods = await searchOpenFoodFactsFoods(query, {
      region,
      language,
      maxResults: 12,
    });

    return NextResponse.json({ foods });
  } catch (error) {
    console.error("Food search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Zoeken mislukt" },
      { status: 500 }
    );
  }
}
