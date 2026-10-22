"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, FileText, Loader2, Settings2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CAROUSEL_STATUS_LABELS, PUBLISH_STATUS_LABELS } from "@/lib/carousel-shared";
import { CarouselSettingsDialog } from "./carousel-settings";
import { UploadCarouselDialog } from "./upload-dialog";
import { FromTextDialog } from "./from-text-dialog";

export type CarouselListItem = {
  id: string;
  title: string;
  hook?: string | null;
  topic: string | null;
  status: string;
  publishStatus: string | null;
  scheduledAt: string | null;
  imageUrls: string[];
  errorMessage: string | null;
  publishError: string | null;
};

const weekFormatter = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long", timeZone: "Europe/Brussels" });

/** Monday (Brussels date, YYYY-MM-DD) of the week a moment falls in. */
function mondayOf(iso: string) {
  const local = new Date(new Date(iso).toLocaleString("en-US", { timeZone: "Europe/Brussels" }));
  const day = (local.getDay() + 6) % 7; // 0 = Monday
  local.setDate(local.getDate() - day);
  local.setHours(12, 0, 0, 0);
  return local;
}

/** Carousels per week ("Week van 6 oktober"); this week and later weeks are open, past weeks closed. */
function groupByWeek(items: CarouselListItem[]) {
  const thisMonday = mondayOf(new Date().toISOString()).getTime();
  const groups = new Map<string, { key: string; label: string; start: number; items: CarouselListItem[] }>();
  for (const item of items) {
    if (!item.scheduledAt) {
      const g = groups.get("none") ?? { key: "none", label: "Niet ingepland", start: Number.MAX_SAFE_INTEGER, items: [] };
      g.items.push(item);
      groups.set("none", g);
      continue;
    }
    const monday = mondayOf(item.scheduledAt);
    const key = monday.toISOString().slice(0, 10);
    const label = monday.getTime() === thisMonday ? `Deze week · week van ${weekFormatter.format(monday)}` : `Week van ${weekFormatter.format(monday)}`;
    const g = groups.get(key) ?? { key, label, start: monday.getTime(), items: [] };
    g.items.push(item);
    groups.set(key, g);
  }
  return Array.from(groups.values())
    .sort((a, b) => a.start - b.start)
    .map((g) => ({
      ...g,
      open: g.start >= thisMonday,
      toReview: g.items.filter((i) => i.status === "DRAFT" || i.status === "READY").length,
    }));
}

const dayFormatter = new Intl.DateTimeFormat("nl-BE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Brussels" });
const timeFormatter = new Intl.DateTimeFormat("nl-BE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });

function StatusChip({ item }: { item: CarouselListItem }) {
  const label =
    item.publishStatus && item.status === "APPROVED" ? PUBLISH_STATUS_LABELS[item.publishStatus] : CAROUSEL_STATUS_LABELS[item.status] ?? item.status;
  const tone =
    item.publishStatus === "PUBLISHED"
      ? "bg-emerald-100 text-emerald-800"
      : item.status === "FAILED" || item.publishStatus === "FAILED"
        ? "bg-red-100 text-red-700"
        : item.status === "APPROVED"
          ? "bg-sky-100 text-sky-800"
          : item.status === "READY"
            ? "bg-amber-100 text-amber-800"
            : "bg-slate-100 text-slate-600";
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs", tone)}>{label}</span>;
}

export function CarouselOverview({
  items,
  tab,
  generating,
  hasBriefing,
}: {
  items: CarouselListItem[];
  tab: "new" | "existing";
  generating: boolean;
  hasBriefing: boolean;
}) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [fromTextOpen, setFromTextOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const busy = generating || items.some((i) => i.status === "WRITING" || (i.status === "DRAFT" && !i.hook));

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), busy ? 5000 : 30000);
    return () => clearInterval(timer);
  }, [router, busy]);

  async function generate() {
    if (
      !hasBriefing &&
      !window.confirm("Je hebt nog geen briefing ingesteld bij Instellingen. AI gebruikt dan de conceptbriefing. Toch een week laten schrijven?")
    )
      return;
    setRequesting(true);
    await fetch("/api/admin/carousels", { method: "POST" });
    setRequesting(false);
    router.refresh();
  }

  async function cancelGenerate() {
    await fetch("/api/admin/carousels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel-generate" }) });
    router.refresh();
  }

  const toReview = items.filter((i) => i.status === "READY" || i.status === "DRAFT").length;

  return (
    <section className="space-y-4">
      <div className="flex rounded-full border border-slate-200 bg-white p-1 text-sm sm:w-fit" role="tablist" aria-label="Soort carousels">
        {(
          [
            ["new", "Nieuwe carousels", "/admin/content/carousels"],
            ["existing", "Bestaande carousels", "/admin/content/carousels?deel=bestaand"],
          ] as const
        ).map(([key, label, href]) => (
          <Link
            key={key}
            href={href}
            role="tab"
            aria-selected={tab === key}
            className={cn("flex-1 rounded-full px-4 py-1.5 text-center", tab === key ? "bg-slate-900 text-white" : "text-slate-600")}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tab === "new" ? (
          <>
            <Button onClick={() => setFromTextOpen(true)}>
              <FileText className="mr-2 h-4 w-4" /> Carousel uit eigen tekst
            </Button>
            <Button variant="outline" onClick={generate} disabled={requesting || generating}>
              {generating || requesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {generating ? "AI schrijft een week…" : "Maak nu een week"}
            </Button>
            {generating ? (
              <Button variant="ghost" onClick={cancelGenerate}>
                Stoppen
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="mr-2 h-4 w-4" /> Instellingen, topics &amp; tone of voice
            </Button>
          </>
        ) : (
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Bestaande carousel inplannen
          </Button>
        )}
        {toReview ? <span className="text-sm text-amber-700">{toReview} na te kijken</span> : null}
        {tab === "new" && !hasBriefing ? (
          <span className="text-sm text-muted-foreground">Tip: plak je goedgekeurde briefing bij Instellingen, dan volgt AI die.</span>
        ) : null}
      </div>
      <CarouselSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} onSaved={() => router.refresh()} />
      <UploadCarouselDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <FromTextDialog open={fromTextOpen} onOpenChange={setFromTextOpen} />

      {items.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-muted-foreground">
          {tab === "new" ? (
            <>
              Nog geen nieuwe carousels. Kies <strong>Carousel uit eigen tekst</strong> of <strong>Maak nu een week</strong>.
            </>
          ) : (
            <>
              Nog geen bestaande carousels. Kies <strong>Bestaande carousel inplannen</strong> en plak een Canva-link of upload je slides.
            </>
          )}
        </p>
      ) : (
        <div className="space-y-3">
          {groupByWeek(items).map((group) => (
            <details key={group.key} open={group.open} className="group/week overflow-hidden rounded-3xl border border-white/70 bg-white/85">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-open/week:rotate-90" />
                <span className="font-semibold text-slate-950">{group.label}</span>
                <span className="text-sm text-muted-foreground">
                  {group.items.length} carousel{group.items.length === 1 ? "" : "s"}
                  {group.toReview ? ` · ${group.toReview} na te kijken` : ""}
                </span>
              </summary>
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <Link href={`/admin/content/carousels/${item.id}`} className="group flex items-center gap-4 px-4 py-3 hover:bg-slate-50">
                      {item.imageUrls[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrls[0]} alt="" className="h-16 w-[52px] shrink-0 rounded-md object-cover" />
                      ) : (
                        <div className="flex h-16 w-[52px] shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400">
                          {item.status === "WRITING" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-950 group-hover:underline">{item.hook || item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          <span className="capitalize">{item.scheduledAt ? dayFormatter.format(new Date(item.scheduledAt)) : "Niet ingepland"}</span>
                          {item.scheduledAt ? ` · ${timeFormatter.format(new Date(item.scheduledAt))}` : ""}
                          {item.hook && item.title !== item.hook ? ` · ${item.title}` : ""}
                        </p>
                        {item.errorMessage || item.publishError ? <p className="truncate text-xs text-red-600">{item.publishError ?? item.errorMessage}</p> : null}
                      </div>
                      <StatusChip item={item} />
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
