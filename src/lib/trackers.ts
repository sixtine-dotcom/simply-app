import { db } from "./db";

/**
 * Get nutrition log for a date range
 */
export async function getNutritionLogs(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return db.nutritionLog.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "desc" },
  });
}

/**
 * Get or create nutrition log for a date
 */
export async function getOrCreateNutritionLog(userId: string, date: Date) {
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  return db.nutritionLog.upsert({
    where: {
      userId_date: {
        userId,
        date: dateOnly,
      },
    },
    update: {},
    create: {
      userId,
      date: dateOnly,
    },
  });
}

/**
 * Get check-ins for a user
 */
export async function getCheckIns(userId: string, limit?: number) {
  return db.checkIn.findMany({
    where: { userId },
    orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
    take: limit,
  });
}

/**
 * Get check-in for a specific week
 */
export async function getCheckInByWeek(
  userId: string,
  weekNumber: number,
  year: number
) {
  return db.checkIn.findUnique({
    where: {
      userId_weekNumber_year: {
        userId,
        weekNumber,
        year,
      },
    },
  });
}

/**
 * Get habit logs for a date range
 */
export async function getHabitLogs(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return db.habitLog.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "desc" },
  });
}

/**
 * Get or create habit log for a date
 */
export async function getOrCreateHabitLog(userId: string, date: Date) {
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  return db.habitLog.upsert({
    where: {
      userId_date: {
        userId,
        date: dateOnly,
      },
    },
    update: {},
    create: {
      userId,
      date: dateOnly,
    },
  });
}

/**
 * Get cycle logs for a date range
 */
export async function getCycleLogs(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return db.cycleLog.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "desc" },
  });
}

/**
 * Get symptom logs for a date range
 */
export async function getSymptomLogs(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return db.symptomLog.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "desc" },
  });
}

/**
 * Get or create symptom log for a date
 */
export async function getOrCreateSymptomLog(userId: string, date: Date) {
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  return db.symptomLog.upsert({
    where: {
      userId_date: {
        userId,
        date: dateOnly,
      },
    },
    update: {},
    create: {
      userId,
      date: dateOnly,
    },
  });
}

/**
 * Calculate week number and year for a date
 */
export function getWeekNumber(date: Date): { weekNumber: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { weekNumber, year: d.getUTCFullYear() };
}

/**
 * Get progress summary for dashboard
 */
export async function getProgressSummary(userId: string) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [todayNutrition, todayHabits, latestCheckIn, recentSymptoms] = await Promise.all([
    getOrCreateNutritionLog(userId, now),
    getOrCreateHabitLog(userId, now),
    db.checkIn.findFirst({
      where: { userId },
      orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
    }),
    db.symptomLog.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
    }),
  ]);

  return {
    todayNutrition,
    todayHabits,
    latestCheckIn,
    recentSymptoms,
  };
}
