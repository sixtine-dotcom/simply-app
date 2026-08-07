import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateHealthTargets, getHealthProfileStatus } from "@/lib/health-profile";

const healthProfileSchema = z.object({
  goal: z.enum(["WEIGHT_LOSS", "WEIGHT_GAIN", "SYMPTOM_RELIEF", "MUSCLE_GAIN"]),
  biologicalSex: z.enum(["FEMALE", "MALE"]),
  age: z.number().int().min(16).max(100),
  heightCm: z.number().int().min(120).max(230),
  weightKg: z.number().min(35).max(300),
  targetWeightKg: z.number().min(35).max(300).nullable().optional(),
  activityLevel: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "HIGH", "ATHLETE"]),
  trainingSessionsPerWeek: z.number().int().min(0).max(21),
  averageDailySteps: z.number().int().min(0).max(50000),
  primarySport: z.string().max(120).nullable().optional(),
  symptoms: z.string().max(1000).nullable().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { profile, isComplete } = await getHealthProfileStatus(user.id);

    return NextResponse.json({
      profile,
      isComplete,
    });
  } catch (error) {
    console.error("Get health profile error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await request.json();
    const data = healthProfileSchema.parse(body);
    const targets = calculateHealthTargets(data);

    const profile = await (db as any).userHealthProfile.upsert({
      where: { userId: user.id },
      update: {
        ...data,
        targetWeightKg: data.targetWeightKg ?? null,
        primarySport: data.primarySport?.trim() || null,
        symptoms: data.symptoms?.trim() || null,
        ...targets,
        completedAt: new Date(),
      },
      create: {
        userId: user.id,
        ...data,
        targetWeightKg: data.targetWeightKg ?? null,
        primarySport: data.primarySport?.trim() || null,
        symptoms: data.symptoms?.trim() || null,
        ...targets,
        completedAt: new Date(),
      },
    });

    await createAuditLog("user.health_profile.updated", user.id, {
      goal: data.goal,
      activityLevel: data.activityLevel,
    });

    return NextResponse.json({
      profile,
      isComplete: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Ongeldige invoer" }, { status: 400 });
    }

    console.error("Update health profile error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
