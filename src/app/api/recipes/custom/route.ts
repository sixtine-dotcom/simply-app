import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserCustomRecipes } from "@/lib/recipes";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const recipes = await getUserCustomRecipes(user.id);
    return NextResponse.json(recipes);
  } catch (error) {
    console.error("Get custom recipes error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
