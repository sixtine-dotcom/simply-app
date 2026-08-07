import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ExternalLink,
  Eye,
  EyeOff,
  Layers3,
  Pencil,
  Plus,
  Sparkles,
} from "lucide-react";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminLandingPagesPage() {
  await requireAdminUser("/admin/landing-pages");

  const pages = await db.landingPage.findMany({
    orderBy: { updatedAt: "desc" },
  });

  const publishedPages = pages.filter((page) => page.isPublished).length;
  const draftPages = pages.length - publishedPages;
  const totalBlocks = pages.reduce((sum, page) => {
    const blocks = Array.isArray(page.blocks) ? page.blocks.length : 0;
    return sum + blocks;
  }, 0);
  const pagesWithHero = pages.filter((page) => page.headline || page.subheadline).length;

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(246,244,238,0.98),rgba(255,255,255,0.95))] px-6 py-7 shadow-card md:px-8 md:py-8">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top,rgba(138,120,88,0.14),transparent_60%)] lg:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Website Workspace
            </div>
            <h1 className="font-display text-3xl tracking-[0.16em] text-foreground md:text-4xl">
              LANDING PAGINA&apos;S
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Beheer je campagnepagina&apos;s, opt-in flows en sales pages op dezelfde manier als een
              modern creator platform: snel overzicht, duidelijke status en directe publicatiepaden.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" asChild>
              <Link href="/admin/offers">
                Naar offers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/landing-pages/new" className="block">
                <Plus className="mr-2 h-4 w-4" />
                Nieuwe landing page
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Link href="/admin/landing-pages" className="block">
          <Card className="border-0 bg-stone-950 text-white shadow-lg hover:opacity-90 transition-opacity cursor-pointer">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-white/60">Live pagina&apos;s</p>
              <p className="mt-3 text-3xl font-semibold">{publishedPages}</p>
              <p className="mt-2 text-sm text-white/70">campagnes die publiek zichtbaar zijn</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/landing-pages/new" className="block">
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Concepten</p>
              <p className="mt-3 text-3xl font-semibold">{draftPages}</p>
              <p className="mt-2 text-sm text-muted-foreground">pagina&apos;s in voorbereiding</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/landing-pages" className="block">
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Totale pagina&apos;s</p>
              <p className="mt-3 text-3xl font-semibold">{pages.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">volledige websitebibliotheek</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/landing-pages" className="block">
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Contentblokken</p>
              <p className="mt-3 text-3xl font-semibold">{totalBlocks}</p>
              <p className="mt-2 text-sm text-muted-foreground">ingezette secties over alle pagina&apos;s</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/landing-pages/new" className="block">
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Hero klaar</p>
              <p className="mt-3 text-3xl font-semibold">{pagesWithHero}</p>
              <p className="mt-2 text-sm text-muted-foreground">pagina&apos;s met headline of subheadline</p>
            </CardContent>
          </Card>
        </Link>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Pagina overzicht</CardTitle>
            <CardDescription>
              Houd grip op publicatie, positionering en de staat van je marketingpagina&apos;s.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
                <Layers3 className="mx-auto h-10 w-10 text-muted-foreground/60" />
                <h2 className="mt-4 text-lg font-semibold">Nog geen landingpagina&apos;s</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start met een sales page, webinarpagina of opt-in funnel en bouw daarna verder.
                </p>
                <Button className="mt-5" asChild>
                  <Link href="/admin/landing-pages/new" className="block">
                    <Plus className="mr-2 h-4 w-4" />
                    Eerste landing page maken
                  </Link>
                </Button>
              </div>
            ) : (
              pages.map((page) => {
                const blockCount = Array.isArray(page.blocks) ? page.blocks.length : 0;
                const ctaCount = Array.isArray(page.blocks)
                  ? page.blocks.filter(
                      (block) =>
                        block &&
                        typeof block === "object" &&
                        "type" in block &&
                        block.type === "cta"
                    ).length
                  : 0;

                return (
                  <div
                    key={page.id}
                    className="rounded-[1.6rem] border border-border bg-background/90 p-5 shadow-sm transition-colors hover:border-primary/30"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <Link href={`/admin/landing-pages/${page.id}`} className="min-w-0 flex-1 block">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-lg font-semibold">{page.title}</h2>
                          {page.isPublished ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                              <Eye className="h-3 w-3" />
                              Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                              <EyeOff className="h-3 w-3" />
                              Concept
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-muted-foreground">/landing/{page.slug}</p>

                        {page.headline ? (
                          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                            {page.headline}
                          </p>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">
                            Nog geen hero headline toegevoegd.
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full bg-muted px-3 py-1.5">
                            {blockCount} blok{blockCount === 1 ? "" : "ken"}
                          </span>
                          <span className="rounded-full bg-muted px-3 py-1.5">
                            {ctaCount} CTA{ctaCount === 1 ? "" : "'s"}
                          </span>
                          <span className="rounded-full bg-muted px-3 py-1.5">
                            Bijgewerkt op {formatDate(page.updatedAt)}
                          </span>
                        </div>
                      </Link>

                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        {page.isPublished ? (
                          <Button variant="outline" asChild>
                            <Link href={`/landing/${page.slug}`} target="_blank" rel="noopener">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Bekijken
                            </Link>
                          </Button>
                        ) : null}
                        <Button asChild variant="outline">
                          <Link href={`/admin/landing-pages/${page.id}?tab=analytics`}>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Analytics
                          </Link>
                        </Button>
                        <Button asChild variant="outline">
                          <Link href={`/admin/landing-pages/${page.id}?tab=editor`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Bewerken
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Website playbook</CardTitle>
              <CardDescription>
                Gebruik je pagina&apos;s als verkoopmachine, niet alleen als losse content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-2xl bg-muted/50 p-4">
                <p className="font-medium text-foreground">1. Eén pagina per campagne</p>
                <p className="mt-1">
                  Geef elk aanbod, webinar of challenge een eigen duidelijke sales route.
                </p>
              </div>
              <div className="rounded-2xl bg-muted/50 p-4">
                <p className="font-medium text-foreground">2. Heldere hero</p>
                <p className="mt-1">
                  Laat boven de vouw meteen de transformatie en call to action zien.
                </p>
              </div>
              <div className="rounded-2xl bg-muted/50 p-4">
                <p className="font-medium text-foreground">3. Koppel aan offers</p>
                <p className="mt-1">
                  Gebruik landing pages als verkeer-ingang en stuur door naar je offerstructuur.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Snelle acties</CardTitle>
              <CardDescription>Werk verder aan de publieke website van je platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-between" variant="outline" asChild>
                <Link href="/admin/landing-pages/new" className="block">
                  Nieuwe pagina aanmaken
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
              <Button className="w-full justify-between" variant="outline" asChild>
                <Link href="/admin/offers">
                  Offers beheren
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button className="w-full justify-between" variant="outline" asChild>
                <Link href="/admin/branding">
                  Branding aanpassen
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
