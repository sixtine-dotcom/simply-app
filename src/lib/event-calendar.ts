function calendarDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function calendarText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function buildEventCalendar(input: {
  id: string;
  title: string;
  description?: string | null;
  startsAt: Date;
  duration: number;
  location?: string | null;
  onlineUrl?: string | null;
  publicUrl: string;
}) {
  const end = new Date(input.startsAt.getTime() + input.duration * 60_000);
  const location = input.location || input.onlineUrl || "Online";
  const description = [input.description, input.onlineUrl, input.publicUrl].filter(Boolean).join("\n\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Simply in Balance//Events//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.id}@simplyapp.be`,
    `DTSTAMP:${calendarDate(new Date())}`,
    `DTSTART:${calendarDate(input.startsAt)}`,
    `DTEND:${calendarDate(end)}`,
    `SUMMARY:${calendarText(input.title)}`,
    `DESCRIPTION:${calendarText(description)}`,
    `LOCATION:${calendarText(location)}`,
    `URL:${input.publicUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function getCalendarLinks(input: {
  title: string;
  description?: string | null;
  startsAt: Date;
  duration: number;
  location?: string | null;
  onlineUrl?: string | null;
  publicUrl: string;
}) {
  const end = new Date(input.startsAt.getTime() + input.duration * 60_000);
  const dates = `${calendarDate(input.startsAt)}/${calendarDate(end)}`;
  const location = input.location || input.onlineUrl || "Online";
  const details = [input.description, input.onlineUrl, input.publicUrl].filter(Boolean).join("\n\n");
  const google = new URL("https://calendar.google.com/calendar/render");
  google.searchParams.set("action", "TEMPLATE");
  google.searchParams.set("text", input.title);
  google.searchParams.set("dates", dates);
  google.searchParams.set("details", details);
  google.searchParams.set("location", location);

  const outlook = new URL("https://outlook.live.com/calendar/0/deeplink/compose");
  outlook.searchParams.set("path", "/calendar/action/compose");
  outlook.searchParams.set("rru", "addevent");
  outlook.searchParams.set("subject", input.title);
  outlook.searchParams.set("startdt", input.startsAt.toISOString());
  outlook.searchParams.set("enddt", end.toISOString());
  outlook.searchParams.set("body", details);
  outlook.searchParams.set("location", location);
  return { google: google.toString(), outlook: outlook.toString() };
}
