import ical, { ICalCalendarMethod } from "ical-generator";

/**
 * Generate ICS calendar file for a coaching session
 */
export function generateSessionICS(session: {
  id: string;
  title: string | null;
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

  calendar.createEvent({
    start: session.scheduledAt,
    end: endTime,
    summary: session.title || `Coaching sessie met ${session.coach.firstName}`,
    description: `Je coaching sessie via Simply.\n\nKlik hier om deel te nemen: ${appUrl}/coaching/${session.id}/room`,
    location: `${appUrl}/coaching/${session.id}/room`,
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

  return calendar.toString();
}
