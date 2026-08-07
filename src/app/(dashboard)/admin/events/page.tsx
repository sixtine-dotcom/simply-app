import Link from "next/link";
import { CalendarDays, Mail, MapPin, Phone, Video } from "lucide-react";
import { requireAdminOrCoachUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";

export default async function AdminEventsPage() {
  const user = await requireAdminOrCoachUser("/admin/events");
  const events = await db.webinar.findMany({
    where: user.role === "COACH" ? { hostId: user.id } : {},
    include: { registrations: { orderBy: { createdAt: "desc" } }, _count: { select: { registrations: true } } },
    orderBy: { startsAt: "desc" },
  });
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  return (
    <div className="p-4 md:p-5 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex items-center justify-between">
          <div><h1 className="text-xl font-semibold text-slate-950">Events</h1><p className="mt-1 text-sm text-muted-foreground">Publieke inschrijvingen en gastenlijsten.</p></div>
          <Button size="sm" asChild><Link href="/admin/events/new">Nieuw event</Link></Button>
        </div>

        {events.length === 0 ? <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">Nog geen events.</div> : events.map((event) => {
          const publicUrl = `${appUrl}/events/${event.registrationSlug}`;
          const guestEmails = event.registrations.map((guest) => guest.email).join(",");
          const emailAllUrl = `mailto:?bcc=${encodeURIComponent(guestEmails)}&subject=${encodeURIComponent(`Praktische informatie: ${event.title}`)}`;
          return (
            <section key={event.id} className="rounded-xl border border-border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{event.title}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{event.startsAt.toLocaleString("nl-BE")} · {event.duration} min · {event._count.registrations} gasten</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">{event.eventType === "physical" ? <MapPin className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}{event.eventType === "physical" ? event.location || "Locatie nog niet ingevuld" : "Online event"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {guestEmails ? (
                    <Button size="sm" variant="outline" asChild>
                      <a href={emailAllUrl}><Mail className="mr-1.5 h-3.5 w-3.5" />Mail alle gasten</a>
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" asChild><Link href={publicUrl} target="_blank">Open inschrijfpagina</Link></Button>
                </div>
              </div>
              <p className="mt-3 break-all rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{publicUrl}</p>

              <div className="mt-3 rounded-lg border border-[#dfe7df] bg-[#f8faf7] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#315c3b]">Ingeschreven deelnemers</p>
                  <span className="rounded-full bg-[#315c3b] px-2 py-0.5 text-xs font-medium text-white">{event.registrations.length}</span>
                </div>
                {event.registrations.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Nog niemand ingeschreven voor dit event.</p>
                ) : (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {event.registrations.map((guest) => (
                      <div key={guest.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e7eee7] text-xs font-semibold text-[#315c3b]">
                          {guest.firstName.charAt(0)}{guest.lastName?.charAt(0) || ""}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-900">{guest.firstName}{guest.lastName ? ` ${guest.lastName}` : ""}</span>
                          <span className="block truncate text-xs text-muted-foreground">{guest.email}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">Volledige gastenlijst en contactgegevens ({event.registrations.length})</summary>
                <div className="mt-2 overflow-x-auto rounded-lg border border-border">
                  {event.registrations.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nog geen inschrijvingen.</p> : (
                    <table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Naam</th><th className="px-3 py-2 font-medium">E-mail</th><th className="px-3 py-2 font-medium">Telefoon</th><th className="px-3 py-2 font-medium">Ingeschreven</th><th className="px-3 py-2 font-medium">Contact</th></tr></thead><tbody>{event.registrations.map((guest) => <tr key={guest.id} className="border-t"><td className="px-3 py-2">{guest.firstName} {guest.lastName}</td><td className="px-3 py-2">{guest.email}</td><td className="px-3 py-2">{guest.phone || "—"}</td><td className="px-3 py-2 text-xs text-muted-foreground">{guest.createdAt.toLocaleDateString("nl-BE")}</td><td className="px-3 py-2"><div className="flex gap-1"><a href={`mailto:${guest.email}`} className="rounded-md border p-1.5" title="E-mail sturen"><Mail className="h-3.5 w-3.5" /></a>{guest.phone ? <a href={`tel:${guest.phone}`} className="rounded-md border p-1.5" title="Bellen"><Phone className="h-3.5 w-3.5" /></a> : null}</div></td></tr>)}</tbody></table>
                  )}
                </div>
              </details>
            </section>
          );
        })}
      </div>
    </div>
  );
}
