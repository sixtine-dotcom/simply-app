import { db } from "@/lib/db";

export type HealthGoal = "WEIGHT_LOSS" | "WEIGHT_GAIN" | "SYMPTOM_RELIEF" | "MUSCLE_GAIN";
export type BiologicalSex = "FEMALE" | "MALE";
export type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "HIGH" | "ATHLETE";

type HealthProfileRecord = {
  goal: HealthGoal;
  biologicalSex: BiologicalSex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  trainingSessionsPerWeek: number;
  averageDailySteps: number;
  completedAt: Date | null;
};

export type HealthProfileInput = {
  goal: HealthGoal;
  biologicalSex: BiologicalSex;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number | null;
  activityLevel: ActivityLevel;
  trainingSessionsPerWeek: number;
  averageDailySteps: number;
  primarySport?: string | null;
  symptoms?: string | null;
};

export type HealthTargets = {
  calorieTarget: number;
  proteinTargetGrams: number;
  carbsTargetGrams: number;
  fatTargetGrams: number;
};

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.35,
  MODERATE: 1.5,
  HIGH: 1.7,
  ATHLETE: 1.9,
};

const GOAL_CALORIE_ADJUSTMENTS: Record<HealthGoal, number> = {
  WEIGHT_LOSS: -425,
  WEIGHT_GAIN: 325,
  SYMPTOM_RELIEF: -100,
  MUSCLE_GAIN: 220,
};

const GOAL_PROTEIN_MULTIPLIERS: Record<HealthGoal, number> = {
  WEIGHT_LOSS: 1.9,
  WEIGHT_GAIN: 1.8,
  SYMPTOM_RELIEF: 1.7,
  MUSCLE_GAIN: 2.1,
};

const GOAL_FAT_MULTIPLIERS: Record<HealthGoal, number> = {
  WEIGHT_LOSS: 0.9,
  WEIGHT_GAIN: 1.0,
  SYMPTOM_RELIEF: 1.0,
  MUSCLE_GAIN: 0.85,
};

export function calculateHealthTargets(input: HealthProfileInput): HealthTargets {
  const sexOffset = input.biologicalSex === "MALE" ? 5 : -161;
  const bmr = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + sexOffset;
  const trainingBoost = Math.min(input.trainingSessionsPerWeek, 10) * 40;
  const stepBoost = Math.round(input.averageDailySteps / 1000) * 18;
  const maintenanceCalories =
    bmr * ACTIVITY_MULTIPLIERS[input.activityLevel] + trainingBoost + stepBoost;

  const calorieTarget = Math.max(
    1200,
    Math.round(maintenanceCalories + GOAL_CALORIE_ADJUSTMENTS[input.goal])
  );

  const proteinTargetGrams = Math.max(
    75,
    Math.round(input.weightKg * GOAL_PROTEIN_MULTIPLIERS[input.goal])
  );
  const fatTargetGrams = Math.max(45, Math.round(input.weightKg * GOAL_FAT_MULTIPLIERS[input.goal]));
  const remainingCalories = calorieTarget - proteinTargetGrams * 4 - fatTargetGrams * 9;
  const carbsTargetGrams = Math.max(50, Math.round(remainingCalories / 4));

  return {
    calorieTarget,
    proteinTargetGrams,
    carbsTargetGrams,
    fatTargetGrams,
  };
}

export function isHealthProfileComplete(
  profile: HealthProfileRecord | null
) {
  return Boolean(
    profile &&
      profile.goal &&
      profile.biologicalSex &&
      profile.age > 0 &&
      profile.heightCm > 0 &&
      profile.weightKg > 0 &&
      profile.activityLevel &&
      profile.trainingSessionsPerWeek >= 0 &&
      profile.averageDailySteps >= 0 &&
      profile.completedAt
  );
}

export async function getHealthProfileStatus(userId: string) {
  const profile = await (db as any).userHealthProfile.findUnique({
    where: { userId },
  });

  return {
    profile,
    isComplete: isHealthProfileComplete(profile),
  };
}
