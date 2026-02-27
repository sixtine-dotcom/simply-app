import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getCheckIns, getCheckInByWeek, getWeekNumber } from "@/lib/trackers";
import { db } from "@/lib/db";

const createCheckInSchema = z.object({
  weekNumber: z.number().int().optional(),
  year: z.number().int().optional(),
  date: z.string().datetime(),
  weight: z.number().optional(),
  waist: z.number().optional(),
  hip: z.number().optional(),
  arm: z.number().optional(),
  photoFront: z.string().url().optional(),
  photoSide: z.string().url().optional(),
  photoBack: z.string().url().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    const checkIns = await getCheckIns(user.id, limit);

    return NextResponse.json(checkIns);
  } catch (error) {
    console.error("Get check-ins error:", error);
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
    const data = createCheckInSchema.parse(body);

    const date = new Date(data.date);
    const { weekNumber, year } = data.weekNumber && data.year
      ? { weekNumber: data.weekNumber, year: data.year }
      : getWeekNumber(date);

    // Check if check-in already exists
    const existing = await getCheckInByWeek(user.id, weekNumber, year);

    if (existing) {
      // Update existing
      const updated = await db.checkIn.update({
        where: { id: existing.id },
        data: {
          weight: data.weight ?? existing.weight,
          waist: data.waist ?? existing.waist,
          hip: data.hip ?? existing.hip,
          arm: data.arm ?? existing.arm,
          photoFront: data.photoFront ?? existing.photoFront,
          photoSide: data.photoSide ?? existing.photoSide,
          photoBack: data.photoBack ?? existing.photoBack,
          notes: data.notes ?? existing.notes,
        },
      });

      return NextResponse.json(updated);
    }

    // Create new
    const checkIn = await db.checkIn.create({
      data: {
        userId: user.id,
        weekNumber,
        year,
        date,
        weight: data.weight,
        waist: data.waist,
        hip: data.hip,
        arm: data.arm,
        photoFront: data.photoFront,
        photoSide: data.photoSide,
        photoBack: data.photoBack,
        notes: data.notes,
      },
    });

    return NextResponse.json(checkIn);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Create check-in error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
