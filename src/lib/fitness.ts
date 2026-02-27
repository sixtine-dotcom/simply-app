import { db } from "./db";
import {
  getStravaActivities,
  refreshStravaToken,
  type StravaActivity,
} from "./strava";

export async function getValidStravaToken(userId: string): Promise<{
  accessToken: string;
  connectionId: string;
} | null> {
  const conn = await db.fitnessConnection.findUnique({
    where: { userId_provider: { userId, provider: "strava" } },
  });
  if (!conn) return null;

  let accessToken = conn.accessToken;
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = conn.expiresAt ? Math.floor(conn.expiresAt.getTime() / 1000) : 0;

  if (expiresAt > 0 && expiresAt - now < 3600 && conn.refreshToken) {
    try {
      const refreshed = await refreshStravaToken(conn.refreshToken);
      await db.fitnessConnection.update({
        where: { id: conn.id },
        data: {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          expiresAt: refreshed.expires_at ? new Date(refreshed.expires_at * 1000) : null,
        },
      });
      accessToken = refreshed.access_token;
    } catch (e) {
      console.error("Strava token refresh failed:", e);
      return null;
    }
  }

  return { accessToken, connectionId: conn.id };
}

function stravaActivityToWorkout(
  userId: string,
  activity: StravaActivity
): {
  userId: string;
  provider: string;
  providerWorkoutId: string;
  type: string | null;
  name: string | null;
  distance: number | null;
  durationSeconds: number | null;
  elevationGain: number | null;
  calories: number | null;
  heartRateAvg: number | null;
  heartRateMax: number | null;
  startTime: Date;
  endTime: Date | null;
} {
  const startTime = new Date(activity.start_date);
  const endTime = new Date(startTime.getTime() + (activity.elapsed_time || 0) * 1000);
  return {
    userId,
    provider: "strava",
    providerWorkoutId: String(activity.id),
    type: activity.type || null,
    name: activity.name || null,
    distance: activity.distance ?? null,
    durationSeconds: activity.moving_time ?? activity.elapsed_time ?? null,
    elevationGain: activity.total_elevation_gain ?? null,
    calories: activity.calories ?? null,
    heartRateAvg: activity.average_heartrate ?? null,
    heartRateMax: activity.max_heartrate ?? null,
    startTime,
    endTime,
  };
}

export async function syncStravaWorkoutsForUser(userId: string): Promise<{
  created: number;
  updated: number;
}> {
  const token = await getValidStravaToken(userId);
  if (!token) return { created: 0, updated: 0 };

  const activities = await getStravaActivities(token.accessToken, {
    perPage: 100,
    after: Math.floor(Date.now() / 1000) - 90 * 24 * 3600,
  });

  let created = 0;
  let updated = 0;

  for (const activity of activities) {
    const data = stravaActivityToWorkout(userId, activity);
    const existing = await db.workout.findUnique({
      where: {
        userId_provider_providerWorkoutId: {
          userId,
          provider: "strava",
          providerWorkoutId: data.providerWorkoutId,
        },
      },
    });
    if (existing) {
      await db.workout.update({
        where: { id: existing.id },
        data: {
          ...data,
          isPublic: existing.isPublic,
        },
      });
      updated++;
    } else {
      await db.workout.create({
        data: { ...data, isPublic: false },
      });
      created++;
    }
  }

  return { created, updated };
}
