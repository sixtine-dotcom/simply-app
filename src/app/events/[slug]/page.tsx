import { CalendarDays, Clock, MapPin, Video } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { WebinarRegistrationForm } from "../../webinars/[slug]/registration-form";
import { getCalendarLinks } from "@/lib/event-calendar";

export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await db.webinar.findUnique({
    where: { registrationSlug: slug },
    select: {
      title: true,
      description: true,
      startsAt: true,
      duration: true,
      eventType: true,
      location: true,
      onlineUrl: true,
      bannerUrl: true,
      registrationOpen: true,
      capacity: true,
      _count: { select: { registrations: true } },
    },
  });

  if (!event) notFound();
  const isFull = event.capacity !== null && event._count.registrations >= event.capacity;
  const mapUrl = event.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`
    : null;
  const publicUrl = `${process.env.APP_URL || "http://localhost:3000"}/events/${slug}`;
  const calendarLinks = getCalendarLinks({ ...event, publicUrl });
  const wazeUrl = event.location ? `https://waze.com/ul?q=${encodeURIComponent(event.location)}&navigate=yes` : null;
  const appleMapsUrl = event.location ? `https://maps.apple.com/?q=${encodeURIComponent(event.location)}` : null;

  return (
    <main className="min-h-screen bg-[#f6f4ee] px-4 py-8 md:py-14">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[#dfe4dc] bg-white shadow-sm">
        {event.bannerUrl ? (
          <div className="h-52 bg-cover bg-center md:h-72" style={{ backgroundImage: `linear-gradient(180deg, transparent 45%, rgba(20,43,25,.5)), url(${event.bannerUrl})` }} />
        ) : null}
        <div className="bg-[#315c3b] px-6 py-7 text-white md:px-9">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/75">Simply in Balance · Event</p>
          <h1 className="mt-3 text-2xl font-semibold md:text-3xl">{event.title}</h1>
        </div>

        <div className="grid gap-7 p-6 md:grid-cols-[1fr_300px] md:p-9">
          <section>
            <div className="space-y-3 text-sm text-slate-700">
              <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#315c3b]" />{event.startsAt.toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-[#315c3b]" />{event.startsAt.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })} · {event.duration} minuten</p>
              <p className="flex items-center gap-2">{event.eventType === "physical" ? <MapPin className="h-4 w-4 text-[#315c3b]" /> : <Video className="h-4 w-4 text-[#315c3b]" />}{event.eventType === "physical" ? event.location || "Locatie volgt" : "Online event"}</p>
              {event.eventType === "physical" && mapUrl ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <a className="rounded-full border px-3 py-1.5 text-xs font-medium text-[#315c3b]" href={mapUrl} target="_blank" rel="noreferrer">Google Maps</a>
                  <a className="rounded-full border px-3 py-1.5 text-xs font-medium text-[#315c3b]" href={wazeUrl!} target="_blank" rel="noreferrer">Waze</a>
                  <a className="rounded-full border px-3 py-1.5 text-xs font-medium text-[#315c3b]" href={appleMapsUrl!} target="_blank" rel="noreferrer">Apple Maps</a>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-2">
                <a className="rounded-full bg-[#eef3ed] px-3 py-1.5 text-xs font-medium text-[#315c3b]" href={calendarLinks.outlook} target="_blank" rel="noreferrer">Outlook-agenda</a>
                <a className="rounded-full bg-[#eef3ed] px-3 py-1.5 text-xs font-medium text-[#315c3b]" href={calendarLinks.google} target="_blank" rel="noreferrer">Google Agenda</a>
                <a className="rounded-full bg-[#eef3ed] px-3 py-1.5 text-xs font-medium text-[#315c3b]" href={`/api/events/${slug}/calendar`}>Andere agenda</a>
              </div>
            </div>
            {event.description ? <p className="mt-6 whitespace-pre-line leading-7 text-slate-600">{event.description}</p> : null}
          </section>

          <aside className="rounded-xl border border-[#dfe4dc] bg-[#fbfcfa] p-5">
            <h2 className="text-base font-semibold text-slate-950">Schrijf je in</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Je hebt geen account nodig. Vul je gegevens in om op de gastenlijst te komen.</p>
            <div className="mt-5">
              {!event.registrationOpen || isFull ? (
                <p className="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-800">{isFull ? "Dit event is volzet." : "De inschrijvingen zijn gesloten."}</p>
              ) : (
                <WebinarRegistrationForm slug={slug} eventType={event.eventType} />
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
