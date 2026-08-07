import ical, { ICalAlarmType, ICalCalendarMethod } from "ical-generator";

/**
 * Generate ICS calendar file for a coaching session
 */
export function generateSessionICS(session: {
  id: string;
  title: string | null;
  description?: string | null;
  scheduledAt: Date;
  duration: number;
  coach: {
    firstName: string;
    lastName: string;
    email: string;
  };
  client: {
    firstName: string;
    lastName: string;
    email: string;
  };
}): string {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const endTime = new Date(
    session.scheduledAt.getTime() + session.duration * 60000
  );

  const calendar = ical({
    name: "Simply Coaching",
    method: ICalCalendarMethod.REQUEST,
  });

  const joinUrl = `${appUrl}/coaching/${session.id}/room`;
  const description = [
    session.description?.trim(),
    "Je coaching sessie via Simply.",
    `Klik hier om deel te nemen: ${joinUrl}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const event = calendar.createEvent({
    start: session.scheduledAt,
    end: endTime,
    summary: session.title || `Coaching sessie met ${session.coach.firstName}`,
    description,
    location: joinUrl,
    organizer: {
      name: `${session.coach.firstName} ${session.coach.lastName}`,
      email: session.coach.email,
    },
    attendees: [
      {
        name: `${session.client.firstName} ${session.client.lastName}`,
        email: session.client.email,
        rsvp: true,
      },
    ],
    url: `${appUrl}/coaching/${session.id}`,
  });
  event.createAlarm({
    type: ICalAlarmType.display,
    trigger: 15 * 60,
    description: "Coaching start over 15 minuten",
  });

  return calendar.toString();
}
