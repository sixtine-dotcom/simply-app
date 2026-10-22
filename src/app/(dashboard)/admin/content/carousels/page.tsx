import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CarouselOverview, CarouselListItem } from "./carousel-overview";

export const dynamic = "force-dynamic";

export default async function CarouselStudioPage({ searchParams }: { searchParams: Promise<{ deel?: string }> }) {
  const user = await requireAdminUser("/admin/content/carousels");
  // Two parts, like Video Studio: new carousels (AI texts, ideas) and existing ones (Canva link / upload).
  const tab = (await searchParams).deel === "bestaand" ? "existing" : "new";
  const carousels = await db.carousel.findMany({
    where: {
      tenantId: user.tenantId ?? null,
      source: tab === "existing" ? { in: ["UPLOAD", "CANVA_LINK"] } : "AI",
      OR: [{ scheduledAt: null }, { scheduledAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }],
    },
    orderBy: { scheduledAt: "asc" },
    select: { id: true, title: true, topic: true, status: true, publishStatus: true, scheduledAt: true, imageUrls: true, errorMessage: true, publishError: true, slides: true },
  });
  const settings = await db.carouselSettings.findFirst({ where: { tenantId: user.tenantId ?? null }, select: { generateRequestedAt: true, autoPublish: true, postTime: true, briefing: true } });

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="app-halo overflow-hidden rounded-[34px] border border-white/70 bg-white/85 p-6 md:p-8">
          <p className="app-kicker">Content · Carousel Studio</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Carousels</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Elke week schrijft AI de tekst van je carousels. Kijk de tekst na en keur goed; zeg dan in Claude &quot;Vul de carousels in&quot; en je
            krijgt de ingevulde ontwerpen in Canva. Bestaande carousels plan je in via een Canva-link of upload. Ze gaan om{" "}
            <strong>{settings?.postTime ?? "07:00"}</strong> online.{" "}
            {settings?.autoPublish
              ? "Ze worden automatisch ingepland."
              : "Kijk ze na en klik op Goedkeuren: dan worden ze ingepland."}
          </p>
        </section>
        <CarouselOverview
          items={carousels.map((c) => ({
            ...c,
            scheduledAt: c.scheduledAt?.toISOString() ?? null,
            imageUrls: (c.imageUrls as string[] | null) ?? [],
            hook: ((c.slides as Array<{ type: string; title?: string }> | null) ?? []).find((sl) => sl.type === "hook")?.title ?? null,
          })) as CarouselListItem[]}
          tab={tab}
          generating={Boolean(settings?.generateRequestedAt)}
          hasBriefing={Boolean(settings?.briefing?.trim())}
        />
      </div>
    </div>
  );
}
