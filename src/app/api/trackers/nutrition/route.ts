import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateNutritionLog, getNutritionLogs } from "@/lib/trackers";
import { db } from "@/lib/db";

const updateNutritionSchema = z.object({
  date: z.string().datetime(),
  calories: z.number().int().min(0).optional(),
  protein: z.number().int().min(0).optional(),
  carbs: z.number().int().min(0).optional(),
  fat: z.number().int().min(0).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate en endDate zijn verplicht" },
        { status: 400 }
      );
    }

    const logs = await getNutritionLogs(
      user.id,
      new Date(startDate),
      new Date(endDate)
    );

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Get nutrition logs error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await request.json();
    const data = updateNutritionSchema.parse(body);

    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    const log = await getOrCreateNutritionLog(user.id, date);

    const updated = await db.nutritionLog.update({
      where: { id: log.id },
      data: {
        calories: data.calories ?? log.calories,
        protein: data.protein ?? log.protein,
        carbs: data.carbs ?? log.carbs,
        fat: data.fat ?? log.fat,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Update nutrition error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
