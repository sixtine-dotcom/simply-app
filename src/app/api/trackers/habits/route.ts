import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateHabitLog, getHabitLogs } from "@/lib/trackers";
import { db } from "@/lib/db";

const updateHabitSchema = z.object({
  date: z.string().datetime(),
  waterGlasses: z.number().int().min(0).optional(),
  steps: z.number().int().min(0).optional(),
  supplements: z.boolean().optional(),
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

    const logs = await getHabitLogs(
      user.id,
      new Date(startDate),
      new Date(endDate)
    );

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Get habit logs error:", error);
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
    const data = updateHabitSchema.parse(body);

    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    const log = await getOrCreateHabitLog(user.id, date);

    const updated = await db.habitLog.update({
      where: { id: log.id },
      data: {
        waterGlasses: data.waterGlasses ?? log.waterGlasses,
        steps: data.steps ?? log.steps,
        supplements: data.supplements ?? log.supplements,
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

    console.error("Update habit error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
