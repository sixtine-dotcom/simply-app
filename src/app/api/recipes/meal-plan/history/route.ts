import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMealPlanHistory } from "@/lib/recipes";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const history = await getMealPlanHistory(user.id);
    return NextResponse.json(history);
  } catch (error) {
    console.error("Get meal plan history error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
