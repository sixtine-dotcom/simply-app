import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, Euro, Users } from "lucide-react";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

const money = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const date = new Intl.DateTimeFormat("nl-BE", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function durationInDays(start: Date | null, end: Date | null) {
  if (!start || !end) return null;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
}

function trajectoryStatus(start: Date | null, end: Date | null) {
  const now = new Date();
  if (!start || !end) return { label: "Planning ontbreekt", className: "bg-amber-50 text-amber-800" };
  if (now < start) return { label: "Gepland", className: "bg-sky-50 text-sky-800" };
  if (now > end) return { label: "Afgelopen", className: "bg-stone-100 text-stone-600" };
  return { label: "Actief", className: "bg-emerald-50 text-emerald-800" };
}

export default async function TrajectoriesPage() {
  await requireAdminUser("/admin/trajecten");

  const courses = await db.course.findMany({
    orderBy: [{ trajectoryStartDate: "desc" }, { updatedAt: "desc" }],
    include: {
      enrollments: {
        select: { revenueCents: true, revenueCurrency: true },
      },
    },
  });

  const totalParticipants = courses.reduce((sum, course) => sum + course.enrollments.length, 0);
  const totalRevenueCents = courses.reduce(
    (sum, course) =>
      sum + course.enrollments.reduce((courseSum, enrollment) => courseSum + (enrollment.revenueCents ?? 0), 0),
    0
  );
  const activeCount = courses.filter((course) => {
    const now = new Date();
    return course.trajectoryStartDate && course.trajectoryEndDate
      && course.trajectoryStartDate <= now && course.trajectoryEndDate >= now;
  }).length;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <section className="relative overflow-hidden rounded-[2.2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(250,248,242,0.98),rgba(255,255,255,0.94))] px-6 py-7 shadow-[0_24px_80px_-34px_rgba(50,32,14,0.28)] md:px-8">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(45,90,39,0.14),transparent_65%)]" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Businessoverzicht</p>
          <h1 className="mt-3 font-display text-3xl tracking-[0.12em] md:text-4xl">TRAJECTEN</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            Inschrijvingen, Shopify-omzet en looptijd per traject of editie in één oogopslag.
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Trajecten" value={courses.length.toString()} icon={<CalendarDays className="h-5 w-5" />} />
        <Summary label="Nu actief" value={activeCount.toString()} icon={<Clock3 className="h-5 w-5" />} />
        <Summary label="Deelnemers" value={totalParticipants.toString()} icon={<Users className="h-5 w-5" />} />
        <Summary label="Geregistreerde omzet" value={money.format(totalRevenueCents / 100)} icon={<Euro className="h-5 w-5" />} dark />
      </section>

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Alle trajecten</h2>
          <p className="mt-1 text-sm text-muted-foreground">Klik op een traject voor deelnemers, e-mailadressen en instellingen.</p>
        </div>

        {courses.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Nog geen trajecten aangemaakt.</CardContent></Card>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {courses.map((course) => {
              const status = trajectoryStatus(course.trajectoryStartDate, course.trajectoryEndDate);
              const duration = durationInDays(course.trajectoryStartDate, course.trajectoryEndDate);
              const revenueCents = course.enrollments.reduce((sum, enrollment) => sum + (enrollment.revenueCents ?? 0), 0);
              const measuredSales = course.enrollments.filter((enrollment) => enrollment.revenueCents !== null).length;

              return (
                <Link key={course.id} href={`/admin/trajecten/${course.id}`} className="group block">
                  <Card className="h-full overflow-hidden border-white/70 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/25 group-hover:shadow-xl">
                    <CardContent className="p-0">
                      <div className="flex items-start justify-between gap-4 border-b border-border/60 p-6">
                        <div>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                          <h3 className="mt-3 text-xl font-semibold">{course.title}</h3>
                        </div>
                        <ArrowRight className="mt-1 h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-y divide-border/60 sm:grid-cols-4 sm:divide-y-0">
                        <Metric label="Inschrijvingen" value={course.enrollments.length.toString()} />
                        <Metric label="Omzet" value={money.format(revenueCents / 100)} sub={measuredSales < course.enrollments.length ? `${measuredSales} Shopify-sales` : undefined} />
                        <Metric label="Looptijd" value={duration ? `${duration} dagen` : "Nog instellen"} />
                        <Metric
                          label="Open"
                          value={course.trajectoryStartDate ? date.format(course.trajectoryStartDate) : "—"}
                          sub={course.trajectoryEndDate ? `t/m ${date.format(course.trajectoryEndDate)}` : undefined}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Summary({ label, value, icon, dark = false }: { label: string; value: string; icon: React.ReactNode; dark?: boolean }) {
  return (
    <Card className={dark ? "border-0 bg-stone-950 text-white" : "app-halo"}>
      <CardContent className="p-5">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${dark ? "bg-white/10" : "bg-primary/10 text-primary"}`}>{icon}</div>
        <p className={`mt-4 text-xs uppercase tracking-[0.2em] ${dark ? "text-white/60" : "text-muted-foreground"}`}>{label}</p>
        <p className="mt-2 text-3xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 truncate text-base font-semibold">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
