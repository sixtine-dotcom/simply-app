import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getTenantBrandingFromHeaders } from "@/lib/branding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeEuro, CheckCircle2 } from "lucide-react";
import { PublicOfferLeadForm } from "./public-offer-lead-form";

function formatEuro(cents: number) {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default async function PublicOfferPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [offer, branding] = await Promise.all([
    db.offer.findUnique({
      where: { slug },
      include: {
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                description: true,
              },
            },
          },
        },
      },
    }),
    getTenantBrandingFromHeaders(),
  ]);

  if (!offer || !offer.isPublished) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(228,186,124,0.22),_transparent_40%),linear-gradient(180deg,#f8f4ee_0%,#fffdf9_100%)] px-6 py-10 md:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <div className="app-panel app-halo mb-10 flex flex-col gap-6 overflow-hidden lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="app-kicker">
              {branding.platformName}
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight md:text-6xl">
              {offer.title}
            </h1>
            {offer.description ? (
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                {offer.description}
              </p>
            ) : null}
          </div>
          <div className="app-panel-muted min-w-[220px] px-5 py-4 text-sm shadow-none">
            <p className="text-muted-foreground">Volgende stap</p>
            <p className="mt-1 font-medium text-slate-950">Laat je gegevens achter en ontvang een persoonlijke opvolging.</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card className="app-halo">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <BadgeEuro className="h-5 w-5 text-primary" />
                  Aanbod
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span className="rounded-full bg-muted px-3 py-1">
                    {formatEuro(offer.priceCents)}
                    {offer.billingInterval ? ` / ${offer.billingInterval}` : ""}
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1">
                    {offer.pricingType === "one_time"
                      ? "Eenmalige aankoop"
                      : offer.pricingType === "subscription"
                        ? "Membership"
                        : "Payment plan"}
                  </span>
                  {offer.trialDays ? (
                    <span className="rounded-full bg-muted px-3 py-1">
                      {offer.trialDays} dagen trial
                    </span>
                  ) : null}
                  {offer.installmentCount ? (
                    <span className="rounded-full bg-muted px-3 py-1">
                      {offer.installmentCount} termijnen
                    </span>
                  ) : null}
                  {offer.accessDurationDays ? (
                    <span className="rounded-full bg-muted px-3 py-1">
                      {offer.accessDurationDays} dagen toegang
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  Laat je gegevens achter en we nemen contact op om je toegang of volgende stap
                  te regelen.
                </p>
              </CardContent>
            </Card>

            <Card className="app-halo">
              <CardHeader>
                <CardTitle className="text-xl">Inbegrepen in dit offer</CardTitle>
              </CardHeader>
              <CardContent>
                {offer.courses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Er zijn nog geen cursussen gekoppeld aan dit offer.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {offer.courses.map((entry) => (
                      <div key={entry.course.id} className="app-panel-muted p-4 shadow-none">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{entry.course.title}</p>
                            {entry.course.description ? (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {entry.course.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <PublicOfferLeadForm offerSlug={offer.slug} offerTitle={offer.title} />
            <div className="mt-4 rounded-[28px] border border-white/70 bg-white/75 p-5 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.28)] backdrop-blur">
              <p className="text-sm font-medium text-slate-950">Professionele opvolging</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Elke aanvraag wordt doorgestuurd naar het adminteam, zodat je dit offer kunt gebruiken als echte premium lead-capture flow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
