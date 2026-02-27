import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateSymptomLog, getSymptomLogs } from "@/lib/trackers";
import { db } from "@/lib/db";

const updateSymptomSchema = z.object({
  date: z.string().datetime(),
  energy: z.number().int().min(1).max(10).optional(),
  cravings: z.number().int().min(1).max(10).optional(),
  digestion: z.number().int().min(1).max(10).optional(),
  sleep: z.number().int().min(1).max(10).optional(),
  mood: z.number().int().min(1).max(10).optional(),
  notes: z.string().optional(),
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

    const logs = await getSymptomLogs(
      user.id,
      new Date(startDate),
      new Date(endDate)
    );

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Get symptom logs error:", error);
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
    const data = updateSymptomSchema.parse(body);

    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    const log = await getOrCreateSymptomLog(user.id, date);

    const updated = await db.symptomLog.update({
      where: { id: log.id },
      data: {
        energy: data.energy ?? log.energy,
        cravings: data.cravings ?? log.cravings,
        digestion: data.digestion ?? log.digestion,
        sleep: data.sleep ?? log.sleep,
        mood: data.mood ?? log.mood,
        notes: data.notes ?? log.notes,
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

    console.error("Update symptom error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
