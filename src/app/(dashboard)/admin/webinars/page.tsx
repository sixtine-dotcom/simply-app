import Link from "next/link";
import { requireAdminOrCoachUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";

export default async function AdminWebinarsPage() {
  const user = await requireAdminOrCoachUser("/admin/webinars");
  const webinars = await db.webinar.findMany({
    where: user.role === "COACH" ? { hostId: user.id } : {},
    include: {
      registrations: { orderBy: { createdAt: "desc" } },
      _count: { select: { registrations: true } },
    },
    orderBy: { startsAt: "desc" },
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";

  return (
    <div className="min-h-screen bg-white p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Webinars</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Publieke webinars voor niet-leden met registratie en deelnamelink.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/webinars/new">Webinar maken</Link>
          </Button>
        </div>

        <div className="space-y-4">
          {webinars.length === 0 ? (
            <div className="rounded-lg border p-8 text-sm text-muted-foreground">
              Nog geen webinars.
            </div>
          ) : (
            webinars.map((webinar) => {
              const registrationUrl = `${appUrl}/webinars/${webinar.registrationSlug}`;
              return (
                <div key={webinar.id} className="rounded-lg border p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{webinar.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {webinar.startsAt.toLocaleString("nl-NL")} · {webinar.duration} min ·{" "}
                        {webinar._count.registrations} inschrijvingen
                      </p>
                      <p className="mt-3 break-all rounded border bg-muted/20 px-3 py-2 text-sm">
                        {registrationUrl}
                      </p>
                    </div>
                    <Button variant="outline" asChild>
                      <Link href={registrationUrl}>Open registratiepagina</Link>
                    </Button>
                  </div>

                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-[#4f52b2]">
                      Inschrijvingen bekijken
                    </summary>
                    <div className="mt-3 overflow-hidden rounded border">
                      {webinar.registrations.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground">Nog geen inschrijvingen.</p>
                      ) : (
                        webinar.registrations.map((registration) => (
                          <div
                            key={registration.id}
                            className="grid grid-cols-[1fr_1fr_170px] border-b px-4 py-2 text-sm last:border-b-0"
                          >
                            <span>
                              {registration.firstName} {registration.lastName}
                            </span>
                            <span>{registration.email}</span>
                            <span className="text-muted-foreground">
                              {registration.createdAt.toLocaleDateString("nl-NL")}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </details>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
