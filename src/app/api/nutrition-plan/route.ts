import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    // Get user's nutrition plan (if exists)
    const nutritionPlan = await db.nutritionPlan.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    if (!nutritionPlan) {
      return NextResponse.json(
        { error: "Geen voedingsschema gevonden" },
        { status: 404 }
      );
    }

    // Return plan data
    return NextResponse.json({
      id: nutritionPlan.id,
      title: nutritionPlan.title,
      fileUrl: nutritionPlan.fileUrl,
      createdAt: nutritionPlan.createdAt,
    });
  } catch (error) {
    console.error("Get nutrition plan error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
