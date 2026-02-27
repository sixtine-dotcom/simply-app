import { db } from "./db";
import { getWeekNumber, getCheckInByWeek } from "./trackers";

export interface WeeklyHighlights {
  stepsTotal: number;
  stepsPreviousWeek: number;
  stepsDelta: number;
  weightCurrent: number | null;
  weightPrevious: number | null;
  weightDelta: number | null;
  workoutsCount: number;
  recipeTitles: string[];
  postsCount: number;
  commentsCount: number;
  likesReceived: number;
  lessonsCompleted: number;
}

/** Maandag 00:00 en zondag 23:59:59 voor een gegeven ISO weeknummer en jaar */
export function getWeekBounds(weekNumber: number, year: number): {
  weekStart: Date;
  weekEnd: Date;
} {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const d = jan4.getUTCDay() || 7; // 1 = Monday, 7 = Sunday
  const mondayOffset = d - 1;
  const week1Monday = new Date(Date.UTC(year, 0, 4 - mondayOffset));
  const weekStart = new Date(week1Monday);
  weekStart.setUTCDate(week1Monday.getUTCDate() + (weekNumber - 1) * 7);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

/** Weekgrenzen voor de week die een gegeven datum bevat */
export function getWeekBoundsForDate(date: Date): {
  weekStart: Date;
  weekEnd: Date;
  weekNumber: number;
  year: number;
} {
  const { weekNumber, year } = getWeekNumber(date);
  const { weekStart, weekEnd } = getWeekBounds(weekNumber, year);
  return { weekStart, weekEnd, weekNumber, year };
}

/** Vorige week (weekStart van vorige week) */
export function getPreviousWeekStart(weekStart: Date): Date {
  const prev = new Date(weekStart);
  prev.setDate(prev.getDate() - 7);
  return prev;
}

/** Bereken highlights voor één gebruiker voor de gegeven week (maandag = weekStart) */
export async function computeWeeklyHighlights(
  userId: string,
  weekStart: Date
): Promise<WeeklyHighlights> {
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  const prevStart = getPreviousWeekStart(start);
  prevStart.setHours(0, 0, 0, 0);
  const prevEnd = new Date(prevStart);
  prevEnd.setDate(prevEnd.getDate() + 6);
  prevEnd.setHours(23, 59, 59, 999);

  const { weekNumber, year } = getWeekNumber(start);
  const prevWN = getWeekNumber(prevStart);

  const [
    habitLogsThis,
    habitLogsPrev,
    checkInThis,
    checkInPrev,
    workoutsThis,
    mealPlan,
    postsThis,
    commentsThis,
    userPostIds,
    lessonsCompletedThis,
  ] = await Promise.all([
    db.habitLog.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
    }),
    db.habitLog.findMany({
      where: {
        userId,
        date: { gte: prevStart, lte: prevEnd },
      },
    }),
    getCheckInByWeek(userId, weekNumber, year),
    getCheckInByWeek(userId, prevWN.weekNumber, prevWN.year),
    db.workout.findMany({
      where: {
        userId,
        startTime: { gte: start, lte: end },
      },
    }),
    db.mealPlan.findUnique({
      where: {
        userId_weekStart: { userId, weekStart: start },
      },
      include: {
        items: { include: { recipe: true } },
      },
    }),
    db.post.findMany({
      where: {
        authorId: userId,
        createdAt: { gte: start, lte: end },
      },
      select: { id: true },
    }),
    db.comment.count({
      where: {
        authorId: userId,
        createdAt: { gte: start, lte: end },
      },
    }),
    db.post.findMany({
      where: {
        authorId: userId,
        createdAt: { gte: start, lte: end },
      },
      select: { id: true },
    }).then((posts) => posts.map((p) => p.id)),
    db.progress.count({
      where: {
        userId,
        completedAt: { not: null, gte: start, lte: end },
      },
    }),
  ]);

  const stepsTotal = habitLogsThis.reduce((s, h) => s + (h.steps ?? 0), 0);
  const stepsPreviousWeek = habitLogsPrev.reduce((s, h) => s + (h.steps ?? 0), 0);
  const stepsDelta = stepsTotal - stepsPreviousWeek;

  const weightCurrent = checkInThis?.weight ?? null;
  const weightPrevious = checkInPrev?.weight ?? null;
  const weightDelta =
    weightCurrent != null && weightPrevious != null
      ? Math.round((weightPrevious - weightCurrent) * 10) / 10
      : null;

  const recipeTitles =
    mealPlan?.items.map((i) => i.recipe.title).filter(Boolean) ?? [];
  const uniqueRecipes = Array.from(new Set(recipeTitles));

  let likesReceived = 0;
  if (userPostIds.length > 0) {
    likesReceived = await db.postLike.count({
      where: {
        postId: { in: userPostIds },
        createdAt: { gte: start, lte: end },
      },
    });
  }

  return {
    stepsTotal,
    stepsPreviousWeek,
    stepsDelta,
    weightCurrent,
    weightPrevious,
    weightDelta,
    workoutsCount: workoutsThis.length,
    recipeTitles: uniqueRecipes,
    postsCount: postsThis.length,
    commentsCount: commentsThis,
    likesReceived,
    lessonsCompleted: lessonsCompletedThis,
  };
}

/** Sla weekoverzicht op (upsert) */
export async function upsertWeeklySummary(
  userId: string,
  weekStart: Date,
  highlights: WeeklyHighlights
) {
  const weekStartDate = new Date(weekStart);
  weekStartDate.setHours(0, 0, 0, 0);

  return db.weeklySummary.upsert({
    where: {
      userId_weekStart: { userId, weekStart: weekStartDate },
    },
    update: { highlights: highlights as unknown as object },
    create: {
      userId,
      weekStart: weekStartDate,
      highlights: highlights as unknown as object,
    },
  });
}

/** Haal het laatste weekoverzicht op voor een gebruiker */
export async function getLatestWeeklySummary(userId: string) {
  return db.weeklySummary.findFirst({
    where: { userId },
    orderBy: { weekStart: "desc" },
  });
}

/** Haal weekoverzicht op voor een specifieke week */
export async function getWeeklySummaryByWeek(
  userId: string,
  weekStart: Date
) {
  const d = new Date(weekStart);
  d.setHours(0, 0, 0, 0);
  return db.weeklySummary.findUnique({
    where: {
      userId_weekStart: { userId, weekStart: d },
    },
  });
}

/** Lijst van alle weekoverzichten voor een gebruiker (voor geschiedenis) */
export async function getWeeklySummaries(userId: string, limit = 10) {
  return db.weeklySummary.findMany({
    where: { userId },
    orderBy: { weekStart: "desc" },
    take: limit,
  });
}
