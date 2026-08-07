import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildEventCalendar } from "@/lib/event-calendar";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await db.webinar.findUnique({ where: { registrationSlug: slug } });
  if (!event) return NextResponse.json({ error: "Event niet gevonden" }, { status: 404 });
  const publicUrl = `${process.env.APP_URL || new URL(request.url).origin}/events/${slug}`;
  const calendar = buildEventCalendar({
    id: event.id, title: event.title, description: event.description, startsAt: event.startsAt,
    duration: event.duration, location: event.location, onlineUrl: event.onlineUrl, publicUrl,
  });
  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
    },
  });
}
