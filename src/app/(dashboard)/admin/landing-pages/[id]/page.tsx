import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Layers3,
  MousePointerClick,
  Search,
  Settings2,
  Target,
  Zap,
} from "lucide-react";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getLandingPageBlockCount,
  getLandingPageBlocks,
  getLandingPageTab,
  LANDING_PAGE_TABS,
} from "@/lib/landing-pages";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LandingPageEditor } from "./landing-page-editor";

const TAB_COPY: Record<
  string,
  {
    title: string;
    description: string;
    emptyTitle: string;
    emptyDescription: string;
  }
> = {
  overview: {
    title: "Performance overzicht",
    description: "Houd de status, conversion-opbouw en volgende optimalisaties bij elkaar.",
    emptyTitle: "",
    emptyDescription: "",
  },
  editor: {
    title: "Visual builder",
    description: "Werk direct aan de pagina-opbouw, secties en publicatieflow.",
    emptyTitle: "",
    emptyDescription: "",
  },
  forms: {
    title: "Formulieren en conversie-ingangen",
    description: "Bereid form capture, hidden fields en submit-acties voor per pagina.",
    emptyTitle: "Nog geen formulierlaag gekoppeld",
    emptyDescription:
      "Gebruik deze tab als thuisbasis voor opt-in formulieren, success redirects en toegang tot gated flows.",
  },
  seo: {
    title: "SEO en discoverability",
    description: "Leg de metadata en indexatie klaar voordat je verkeer naar de pagina stuurt.",
    emptyTitle: "SEO-configuratie volgt hier",
    emptyDescription:
      "Voorzie title, description, social image en canonical settings per pagina in plaats van losse notities.",
  },
  tracking: {
    title: "Tracking en scripts",
    description: "Verzamel hier pixels, consent-ready scripts en event-koppelingen.",
    emptyTitle: "Tracking-koppelingen volgen hier",
    emptyDescription:
      "Deze tab wordt de plek voor Meta Pixel, Google tags en custom scripts zonder de builder te vervuilen.",
  },
  analytics: {
    title: "Analytics workspace",
    description: "Gebruik deze laag straks voor page views, CTA clicks, form submits en trendgrafieken.",
    emptyTitle: "Analytics komt hier samen",
    emptyDescription:
      "De informatiearchitectuur staat nu klaar zodat metrics later niet als losse widgets in de lijstpagina belanden.",
  },
  automations: {
    title: "Automations na conversie",
    description: "Koppel pagina-acties aan tags, flows, notificaties en delivery.",
    emptyTitle: "Automation-koppelingen volgen hier",
    emptyDescription:
      "Na een inschrijving of klik wil je direct sequences, interne alerts of CRM-acties kunnen starten.",
  },
  delivery: {
    title: "Delivery en toegang",
    description: "Bereid de route voor van conversie naar minicourse, gated content of onboarding.",
    emptyTitle: "Delivery rules komen hier",
    emptyDescription:
      "Gebruik deze plek straks voor course access, bedankpagina’s en gated community-toegang.",
  },
  settings: {
    title: "Publicatie en domeininstellingen",
    description: "Bundel hier publicatiestatus, slug, domein en operationele instellingen.",
    emptyTitle: "Operationele settings volgen hier",
    emptyDescription:
      "Deze tab houdt de builder schoon door technische en publicatiegerichte instellingen apart te zetten.",
  },
};

export default async function AdminLandingPageEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdminUser("/admin/landing-pages");

  const { id } = await params;
  const query = await searchParams;
  const activeTab = getLandingPageTab(query.tab);

  const page = await db.landingPage.findUnique({ where: { id } });
  if (!page) notFound();

  const blocks = getLandingPageBlocks(page.blocks);
  const ctaCount = getLandingPageBlockCount(blocks, "cta");
  const proofCount =
    getLandingPageBlockCount(blocks, "testimonials") + getLandingPageBlockCount(blocks, "faq");
  const conversionBlockCount =
    getLandingPageBlockCount(blocks, "pricing") +
    getLandingPageBlockCount(blocks, "product") +
    getLandingPageBlockCount(blocks, "calendly");
  const publicHref = `/landing/${page.slug}`;

  const actionItems = [
    !page.headline?.trim() ? "Voeg een heldere hero headline toe." : null,
    ctaCount === 0 ? "Plaats minimaal één duidelijke CTA boven of direct na de hero." : null,
    proofCount === 0 ? "Voeg testimonials of FAQ toe om bezwaren op te vangen." : null,
    conversionBlockCount === 0 ? "Koppel een pricing-, product- of boekingsblok aan de pagina." : null,
  ].filter(Boolean) as string[];

  return (
    <div className="p-6 md:p-8 lg:p-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(246,244,238,0.98),rgba(255,255,255,0.95))] px-6 py-7 shadow-card md:px-8 md:py-8">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top,rgba(138,120,88,0.14),transparent_60%)] lg:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              Landing Page Workspace
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/admin/landing-pages"
                className="text-sm text-muted-foreground transition hover:text-foreground"
              >
                Landing Pages
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium text-foreground">{page.title}</span>
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
            <h1 className="mt-4 font-display text-3xl tracking-[0.16em] text-foreground md:text-4xl">
              {page.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Bouw, publiceer en optimaliseer deze pagina vanuit een vaste workspace in plaats van
              vanuit alleen een losse builder.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" asChild>
              <Link href={`${publicHref}`} target="_blank" rel="noopener">
                <ExternalLink className="mr-2 h-4 w-4" />
                Preview
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/admin/landing-pages/${page.id}?tab=editor`}>
                Open editor
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-6 flex flex-wrap gap-2">
        {LANDING_PAGE_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/admin/landing-pages/${page.id}?tab=${tab.id}`}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition",
              activeTab === tab.id
                ? "border-stone-950 bg-stone-950 text-white"
                : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
            aria-current={activeTab === tab.id ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </section>

      {activeTab === "overview" ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{TAB_COPY.overview.title}</CardTitle>
                <CardDescription>{TAB_COPY.overview.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <OverviewStat
                  icon={Layers3}
                  label="Page mix"
                  value={`${blocks.length} secties`}
                  helper={`${getLandingPageBlockCount(blocks, "heading")} koppen, ${getLandingPageBlockCount(
                    blocks,
                    "text"
                  )} tekstblokken`}
                />
                <OverviewStat
                  icon={MousePointerClick}
                  label="Conversie-opbouw"
                  value={`${ctaCount} CTA${ctaCount === 1 ? "" : "'s"}`}
                  helper={
                    conversionBlockCount > 0
                      ? `${conversionBlockCount} conversion-sectie gekoppeld`
                      : "Nog geen pricing-, product- of booking-flow"
                  }
                />
                <OverviewStat
                  icon={BarChart3}
                  label="Analytics readiness"
                  value={page.isPublished ? "Klaar voor verkeer" : "Nog concept"}
                  helper="Gebruik straks deze pagina als vaste basis voor views en conversion data."
                />
                <OverviewStat
                  icon={Search}
                  label="SEO basis"
                  value={page.slug}
                  helper="Slug staat klaar; metadata en OG settings krijgen een eigen tab."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workspace-opbouw</CardTitle>
                <CardDescription>
                  Deze pagina is nu ingericht als conversion workspace met vaste lagen voor bouwen,
                  meten en opvolgen.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <WorkspaceCard
                  icon={Activity}
                  title="Overzicht"
                  body="Gebruik dit tabblad voor status, campagnegereedheid en optimization checks voordat je verkeer stuurt."
                />
                <WorkspaceCard
                  icon={Zap}
                  title="Editor"
                  body="De builder blijft je uitvoeringslaag voor hero, blocks, drag-and-drop en publicatie."
                />
                <WorkspaceCard
                  icon={ClipboardList}
                  title="Forms en delivery"
                  body="Hier koppel je later opt-ins, hidden fields, toegang tot content en success redirects."
                />
                <WorkspaceCard
                  icon={Target}
                  title="Tracking en analytics"
                  body="Reserveer vaste plekken voor CTA clicks, page views, UTM-data en experiments in plaats van losse widgets."
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Publicatie snapshot</CardTitle>
                <CardDescription>Operationele status van deze pagina.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="font-medium text-foreground">Publieke URL</p>
                  <p className="mt-1 break-all">/landing/{page.slug}</p>
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="font-medium text-foreground">Laatst bijgewerkt</p>
                  <p className="mt-1">{formatDate(page.updatedAt)}</p>
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="font-medium text-foreground">Status</p>
                  <p className="mt-1">{page.isPublished ? "Live en zichtbaar voor verkeer" : "Concept, nog niet publiek"}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Volgende stappen</CardTitle>
                <CardDescription>Wat deze pagina nu nog nodig heeft voor een sterkere flow.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {actionItems.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    Deze pagina heeft de basis voor een volwassen conversion flow al staan. De volgende winst zit nu in analytics, forms en experiments.
                  </div>
                ) : (
                  actionItems.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                      <span>{item}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === "editor" ? (
        <div className="mt-6">
          <LandingPageEditor
            id={page.id}
            initialTitle={page.title}
            initialSlug={page.slug}
            initialHeadline={page.headline ?? ""}
            initialSubheadline={page.subheadline ?? ""}
            initialIsPublished={page.isPublished}
            initialShopifyStoreDomain={page.shopifyStoreDomain ?? ""}
            initialShopifyStorefrontToken={page.shopifyStorefrontToken ?? ""}
            initialBlocks={blocks as unknown as Record<string, unknown>[]}
            embedded
          />
        </div>
      ) : null}

      {activeTab !== "overview" && activeTab !== "editor" ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
          <Card>
            <CardHeader>
              <CardTitle>{TAB_COPY[activeTab].title}</CardTitle>
              <CardDescription>{TAB_COPY[activeTab].description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.6rem] border border-dashed border-border bg-muted/30 px-6 py-10">
                <h2 className="text-lg font-semibold">{TAB_COPY[activeTab].emptyTitle}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {TAB_COPY[activeTab].emptyDescription}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <WorkspaceCard
                  icon={Bot}
                  title="Waarom deze laag apart hoort"
                  body="Een conversion platform voelt direct sterker wanneer bouwen, meten en opvolgen ieder een vaste plek hebben."
                />
                <WorkspaceCard
                  icon={Settings2}
                  title="Waarom dit nu al waarde heeft"
                  body="De informatiearchitectuur staat vast, zodat nieuwe features niet als losse knoppen in de builder terechtkomen."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Context van deze pagina</CardTitle>
              <CardDescription>Gebruik de huidige paginaopbouw als startpunt voor deze nieuwe laag.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl bg-muted/40 p-4">
                <p className="font-medium text-foreground">Titel</p>
                <p className="mt-1">{page.title}</p>
              </div>
              <div className="rounded-2xl bg-muted/40 p-4">
                <p className="font-medium text-foreground">Slug</p>
                <p className="mt-1">{page.slug}</p>
              </div>
              <div className="rounded-2xl bg-muted/40 p-4">
                <p className="font-medium text-foreground">Bestaande content</p>
                <p className="mt-1">
                  {blocks.length} secties, {ctaCount} CTA&apos;s en {conversionBlockCount} directe conversion-blokken.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function OverviewStat({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Layers3;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-background/90 p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-4 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{helper}</p>
    </div>
  );
}

function WorkspaceCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Activity;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-background/90 p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}
