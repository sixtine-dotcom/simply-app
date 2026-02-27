import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getCycleLogs } from "@/lib/trackers";
import { db } from "@/lib/db";

const updateCycleSchema = z.object({
  date: z.string().datetime(),
  phase: z.enum(["menstrual", "follicular", "ovulation", "luteal"]).optional(),
  flowLevel: z.number().int().min(1).max(5).optional(),
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

    const logs = await getCycleLogs(
      user.id,
      new Date(startDate),
      new Date(endDate)
    );

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Get cycle logs error:", error);
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
    const data = updateCycleSchema.parse(body);

    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    const log = await db.cycleLog.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date,
        },
      },
      update: {
        phase: data.phase,
        flowLevel: data.flowLevel,
        notes: data.notes,
      },
      create: {
        userId: user.id,
        date,
        phase: data.phase,
        flowLevel: data.flowLevel,
        notes: data.notes,
      },
    });

    return NextResponse.json(log);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Update cycle error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
