import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Euro, Mail, Users } from "lucide-react";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrajectorySettingsForm } from "./trajectory-settings-form";

const money = new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" });
const date = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "short", year: "numeric" });

export default async function TrajectoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminUser("/admin/trajecten");
  const course = await db.course.findUnique({
    where: { id },
    include: {
      enrollments: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
  });
  if (!course) notFound();

  const revenueCents = course.enrollments.reduce((sum, enrollment) => sum + (enrollment.revenueCents ?? 0), 0);
  const now = new Date();

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Button variant="ghost" asChild className="-ml-3 mb-4">
        <Link href="/admin/trajecten"><ArrowLeft className="mr-2 h-4 w-4" />Alle trajecten</Link>
      </Button>

      <div className="flex flex-col gap-5 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-lg md:flex-row md:items-end md:justify-between md:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Trajectdetails</p>
          <h1 className="mt-3 font-display text-3xl tracking-[0.1em]">{course.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {course.trajectoryStartDate && course.trajectoryEndDate
              ? `${date.format(course.trajectoryStartDate)} – ${date.format(course.trajectoryEndDate)}`
              : "De vaste looptijd moet nog worden ingesteld."}
          </p>
        </div>
        <Button variant="outline" asChild><Link href={`/admin/courses/${course.id}`}>Cursus beheren</Link></Button>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="app-halo"><CardContent className="p-6">
          <Users className="h-5 w-5 text-primary" />
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">Inschrijvingen</p>
          <p className="mt-2 text-3xl font-semibold">{course.enrollments.length}</p>
        </CardContent></Card>
        <Card className="border-0 bg-stone-950 text-white"><CardContent className="p-6">
          <Euro className="h-5 w-5" />
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/60">Geregistreerde Shopify-omzet</p>
          <p className="mt-2 text-3xl font-semibold">{money.format(revenueCents / 100)}</p>
        </CardContent></Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.4fr]">
        <Card>
          <CardHeader><CardTitle>Openingsperiode</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-5 text-sm leading-6 text-muted-foreground">
              Deze data vormen de vaste planning van deze editie en verschijnen in het overzicht.
            </p>
            <TrajectorySettingsForm
              courseId={course.id}
              startDate={course.trajectoryStartDate?.toISOString() ?? null}
              endDate={course.trajectoryEndDate?.toISOString() ?? null}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deelnemers ({course.enrollments.length})</CardTitle>
            <p className="text-sm text-muted-foreground">Klik op een e-mailadres om rechtstreeks een bericht op te stellen.</p>
          </CardHeader>
          <CardContent>
            {course.enrollments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nog geen deelnemers in dit traject.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="border-b text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <tr><th className="pb-3 font-medium">Deelnemer</th><th className="pb-3 font-medium">E-mail</th><th className="pb-3 font-medium">Ingeschreven</th><th className="pb-3 text-right font-medium">Omzet</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {course.enrollments.map((enrollment) => {
                      const active = enrollment.startDate <= now && (!enrollment.endDate || enrollment.endDate >= now);
                      return (
                        <tr key={enrollment.id}>
                          <td className="py-4">
                            <Link href={`/admin/users/${enrollment.user.id}`} className="font-semibold hover:text-primary">
                              {enrollment.user.firstName} {enrollment.user.lastName}
                            </Link>
                            <p className={`mt-1 text-xs ${active ? "text-emerald-700" : "text-muted-foreground"}`}>{active ? "Actieve toegang" : "Niet actief"}</p>
                          </td>
                          <td className="py-4"><a href={`mailto:${enrollment.user.email}`} className="inline-flex items-center gap-2 hover:text-primary"><Mail className="h-3.5 w-3.5" />{enrollment.user.email}</a></td>
                          <td className="py-4 text-muted-foreground">{date.format(enrollment.createdAt)}</td>
                          <td className="py-4 text-right font-semibold">{enrollment.revenueCents === null ? "—" : money.format(enrollment.revenueCents / 100)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
