import { createHmac, timingSafeEqual } from "node:crypto";
import ical, { ICalAlarmType, ICalCalendarMethod, ICalEventStatus } from "ical-generator";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is required for coaching calendar subscriptions");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(`coaching-calendar:v1:${payload}`).digest("base64url");
}

// Calendar apps fetch without a login cookie. This capability grants read-only
// access to this client's calendar only; it cannot authenticate any other route.
export function createCoachingCalendarToken(userId: string, tenantId: string | null) {
  const payload = Buffer.from(JSON.stringify({ userId, tenantId })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function readCoachingCalendarToken(token: string): { userId: string; tenantId: string | null } | null {
  if (token.length > 2048) return null;
  const [payload, supplied, extra] = token.split(".");
  if (!payload || !supplied || extra) return null;
  const expected = signature(payload);
  if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.userId !== "string" || !data.userId || (data.tenantId !== null && typeof data.tenantId !== "string")) return null;
    return { userId: data.userId, tenantId: data.tenantId };
  } catch {
    return null;
  }
}

type CalendarSession = {
  id: string;
  title: string | null;
  description: string | null;
  scheduledAt: Date;
  duration: number;
  status: string;
  updatedAt: Date;
};

export function generateCoachingCalendar(sessions: CalendarSession[], appUrl: string) {
  const calendar = ical({ name: "Simply · Coachingsessies", method: ICalCalendarMethod.PUBLISH, ttl: 3600 });
  for (const session of sessions) {
    const roomUrl = `${appUrl}/coaching/${session.id}/room`;
    const event = calendar.createEvent({
      id: `coaching-${session.id}@simplyapp`,
      start: session.scheduledAt,
      end: new Date(session.scheduledAt.getTime() + session.duration * 60_000),
      summary: session.title || "Coachingsessie",
      description: [session.description?.trim(), `Deelnemen: ${roomUrl}`].filter(Boolean).join("\n\n"),
      location: roomUrl,
      url: `${appUrl}/coaching/${session.id}`,
      lastModified: session.updatedAt,
      status: session.status === "cancelled" ? ICalEventStatus.CANCELLED : ICalEventStatus.CONFIRMED,
    });
    event.createAlarm({ type: ICalAlarmType.display, trigger: 15 * 60, description: "Je coaching start over 15 minuten" });
  }
  return calendar.toString();
}
