"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, ExternalLink, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Category, loadCategories, swatchFor } from "./categories";
import { DayAgenda, MonthGrid, WeekBoard, isoDate, startOfWeek } from "./calendar-views";
import { ContentPlannerDialog } from "./content-planner-dialog";
import { ContentDraft, loadDraftsFromStorage, saveDraftToStorage } from "./types";

type Props = {
  googleConfigured: boolean;
  googleConnected: boolean;
  googleEmail: string | null;
  hasDriveReadScope: boolean;
  canvaConfigured: boolean;
  canvaConnected: boolean;
  metaConfigured: boolean;
  metaConnected: boolean;
  metaAccountName: string | null;
  instagramConfigured: boolean;
  instagramConnected: boolean;
  instagramAccountName: string | null;
  tiktokConfigured: boolean;
  tiktokConnected: boolean;
  tiktokAccountName: string | null;
};

type ViewMode = "day" | "week" | "month";

export function ContentPlannerWorkspace({ googleConfigured, googleConnected, googleEmail, hasDriveReadScope, canvaConfigured, canvaConnected, metaConfigured, metaConnected, metaAccountName, instagramConfigured, instagramConnected, instagramAccountName, tiktokConfigured, tiktokConnected, tiktokAccountName }: Props) {
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [hiddenCategoryIds, setHiddenCategoryIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<ContentDraft | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);
  const [metaSetupOpen, setMetaSetupOpen] = useState(false);
  const [canvaSetupOpen, setCanvaSetupOpen] = useState(false);

  const connectHref = "/api/calendar/connect/google?returnTo=%2Fadmin%2Fcontent%3Fgoogle%3Dconnected";

  function refresh() {
    const cats = loadCategories();
    setCategories(cats);
    setDrafts(loadDraftsFromStorage(cats[0]?.id || ""));
  }

  useEffect(() => {
    refresh();
  }, []);

  function openNewPost(date?: string) {
    setEditingDraft(null);
    setPrefillDate(date ?? null);
    setDialogOpen(true);
  }

  function openExistingPost(draft: ContentDraft) {
    setEditingDraft(draft);
    setPrefillDate(null);
    setDialogOpen(true);
  }

  function toggleCategoryFilter(id: string) {
    setHiddenCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function rescheduleTo(videoId: string, publicationId: string, dateKey: string) {
    const draft = drafts.find((item) => item.video.id === videoId);
    const publication = draft?.publications.find((item) => item.id === publicationId);
    if (!draft || !publication) return;
    const original = new Date(publication.scheduledAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const nextScheduledAt = dateKey.includes("T")
      ? dateKey
      : `${dateKey}T${pad(original.getHours())}:${pad(original.getMinutes())}`;
    const updated: ContentDraft = {
      ...draft,
      publications: draft.publications.map((item) => (item.id === publicationId ? { ...item, scheduledAt: nextScheduledAt } : item)),
    };
    saveDraftToStorage(updated);
    refresh();
  }

  function shift(direction: 1 | -1) {
    setAnchorDate((current) => {
      const next = new Date(current);
      if (viewMode === "month") next.setMonth(next.getMonth() + direction);
      else if (viewMode === "week") next.setDate(next.getDate() + direction * 7);
      else next.setDate(next.getDate() + direction);
      return next;
    });
  }

  const scheduled = useMemo(
    () =>
      drafts
        .filter((draft) => !hiddenCategoryIds.has(draft.categoryId))
        .flatMap((draft) => draft.publications.map((publication) => ({ draft, publication }))),
    [drafts, hiddenCategoryIds]
  );

  const monthDate = useMemo(() => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1), [anchorDate]);
  const weekStartDate = useMemo(() => startOfWeek(anchorDate), [anchorDate]);

  const rangeLabel = useMemo(() => {
    if (viewMode === "month") return monthDate.toLocaleDateString("nl-BE", { month: "long", year: "numeric" });
    if (viewMode === "day") return anchorDate.toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const end = new Date(weekStartDate);
    end.setDate(weekStartDate.getDate() + 6);
    const sameMonth = weekStartDate.getMonth() === end.getMonth();
    const startLabel = weekStartDate.toLocaleDateString("nl-BE", { day: "numeric", month: sameMonth ? undefined : "short" });
    const endLabel = end.toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" });
    return `${startLabel} – ${endLabel}`;
  }, [viewMode, monthDate, weekStartDate, anchorDate]);

  const visibleCount = useMemo(() => {
    if (viewMode === "month") {
      return scheduled.filter(({ publication }) => {
        const d = new Date(publication.scheduledAt);
        return d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth();
      }).length;
    }
    if (viewMode === "week") {
      const end = new Date(weekStartDate);
      end.setDate(weekStartDate.getDate() + 7);
      return scheduled.filter(({ publication }) => {
        const d = new Date(publication.scheduledAt);
        return d >= weekStartDate && d < end;
      }).length;
    }
    const key = isoDate(anchorDate);
    return scheduled.filter(({ publication }) => isoDate(new Date(publication.scheduledAt)) === key).length;
  }, [scheduled, viewMode, monthDate, weekStartDate, anchorDate]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center justify-between rounded-2xl border border-border bg-white p-4">
          <div><p className="font-semibold text-slate-900">Canva</p><p className="text-xs text-muted-foreground">{canvaConnected ? "Verbonden · designs rechtstreeks kiezen" : "Nog niet verbonden"}</p></div>
          {canvaConfigured ? (
            <Button asChild variant={canvaConnected ? "outline" : "default"} size="sm"><a href="/api/integrations/canva/connect">{canvaConnected ? "Opnieuw koppelen" : "Canva koppelen"}</a></Button>
          ) : (
            <Button type="button" size="sm" onClick={() => setCanvaSetupOpen(true)}>Configuratie nodig</Button>
          )}
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border bg-white p-4">
          <div><p className="font-semibold text-slate-900">Instagram</p><p className="text-xs text-muted-foreground">{instagramConnected ? `Verbonden${instagramAccountName ? ` · ${instagramAccountName}` : ""}` : "Nog niet verbonden"}</p></div>
          {instagramConfigured ? (
            <Button asChild variant={instagramConnected ? "outline" : "default"} size="sm"><a href="/api/integrations/instagram/connect">{instagramConnected ? "Opnieuw koppelen" : "Instagram koppelen"}</a></Button>
          ) : (
            <Button type="button" size="sm" onClick={() => setMetaSetupOpen(true)}>Configuratie nodig</Button>
          )}
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border bg-white p-4">
          <div><p className="font-semibold text-slate-900">Facebook</p><p className="text-xs text-muted-foreground">{metaConnected ? `Verbonden${metaAccountName ? ` · ${metaAccountName}` : ""}` : "Nog niet verbonden"}</p></div>
          {metaConfigured ? (
            <Button asChild variant={metaConnected ? "outline" : "default"} size="sm"><a href="/api/integrations/meta/connect">{metaConnected ? "Opnieuw koppelen" : "Facebook koppelen"}</a></Button>
          ) : (
            <Button type="button" size="sm" onClick={() => setMetaSetupOpen(true)}>Configuratie nodig</Button>
          )}
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border bg-white p-4">
          <div><p className="font-semibold text-slate-900">TikTok</p><p className="text-xs text-muted-foreground">{tiktokConnected ? `Verbonden${tiktokAccountName ? ` · ${tiktokAccountName}` : ""}` : tiktokConfigured ? "Nog niet verbonden" : "TIKTOK_CLIENT_KEY en TIKTOK_CLIENT_SECRET ontbreken"}</p></div>
          {tiktokConfigured ? (
            <Button asChild variant={tiktokConnected ? "outline" : "default"} size="sm"><a href="/api/integrations/tiktok/connect">{tiktokConnected ? "Opnieuw koppelen" : "TikTok koppelen"}</a></Button>
          ) : (
            <Button type="button" size="sm" variant="outline" disabled>Configuratie nodig</Button>
          )}
        </div>
      </div>
      <Card className="app-halo">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-xl font-normal text-slate-950">
              <CalendarDays className="h-5 w-5 text-primary" />
              Agenda
            </h2>
            <Button onClick={() => openNewPost()}>
              <Plus className="mr-2 h-4 w-4" />
              Nieuwe post
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
              {(["day", "week", "month"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    viewMode === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {mode === "day" ? "Dag" : mode === "week" ? "Week" : "Maand"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setAnchorDate(new Date())}>
                Vandaag
              </Button>
              <Button variant="outline" size="icon" onClick={() => shift(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-40 text-center text-sm font-semibold capitalize text-slate-900">{rangeLabel}</span>
              <Button variant="outline" size="icon" onClick={() => shift(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <FilterMenu categories={categories} hiddenCategoryIds={hiddenCategoryIds} onToggle={toggleCategoryFilter} onReset={() => setHiddenCategoryIds(new Set())} />
          </div>

          <p className="text-sm text-muted-foreground">
            {visibleCount > 0 ? `${visibleCount} moment${visibleCount === 1 ? "" : "en"} in deze weergave.` : "Nog niets ingepland in deze periode."}
          </p>
        </CardHeader>
        <CardContent>
          {viewMode === "month" ? (
            <MonthGrid month={monthDate} scheduled={scheduled} categories={categories} onSelect={openExistingPost} onQuickAdd={openNewPost} onReschedule={rescheduleTo} />
          ) : viewMode === "week" ? (
            <WeekBoard weekStart={weekStartDate} scheduled={scheduled} categories={categories} onSelect={openExistingPost} onQuickAdd={openNewPost} onReschedule={rescheduleTo} />
          ) : (
            <DayAgenda date={anchorDate} scheduled={scheduled} categories={categories} onSelect={openExistingPost} onQuickAdd={openNewPost} />
          )}
        </CardContent>
      </Card>

      <ContentPlannerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialDraft={editingDraft}
        initialDate={prefillDate}
        googleConfigured={googleConfigured}
        googleConnected={googleConnected}
        googleEmail={googleEmail}
        hasDriveReadScope={hasDriveReadScope}
        connectHref={connectHref}
        canvaConnected={canvaConnected}
        instagramConnected={instagramConnected}
        facebookConnected={metaConnected}
        tiktokConnected={tiktokConnected}
        onSaved={refresh}
        onDeleted={refresh}
      />

      <Dialog open={canvaSetupOpen} onOpenChange={setCanvaSetupOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Canva éénmalig instellen</DialogTitle>
            <DialogDescription>De koppeling in Simply is gebouwd. Canva vereist eerst een eigen beveiligde integratie voordat de knop “Canva koppelen” actief kan worden.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <ol className="list-decimal space-y-2 pl-5 text-slate-700">
              <li>Open Canva Developers en kies <strong>Create an integration</strong>.</li>
              <li>Kopieer de Client ID en genereer één Client Secret.</li>
              <li>Activeer de scopes <strong>design:meta:read</strong> en <strong>design:content:read</strong>.</li>
              <li>Voeg de onderstaande redirect-URL toe bij Authentication.</li>
              <li>Plaats de Client ID en het Secret beveiligd in de appconfiguratie.</li>
            </ol>
            <div className="space-y-2 rounded-xl border border-border bg-slate-50 p-3 font-mono text-xs text-slate-700">
              <p className="break-all">https://simplyapp.be/api/integrations/canva/callback</p>
              <p className="break-all">http://127.0.0.1:3000/api/integrations/canva/callback</p>
            </div>
            <p className="text-xs text-muted-foreground">Canva staat voor lokale ontwikkeling 127.0.0.1 toe, maar geen localhost. Het Client Secret mag nooit in een screenshot of openbaar document staan.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setCanvaSetupOpen(false)}>Sluiten</Button>
            <Button asChild><a href="https://www.canva.com/developers/integrations" target="_blank" rel="noreferrer">Open Canva Developers<ExternalLink className="ml-2 h-4 w-4" /></a></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={metaSetupOpen} onOpenChange={setMetaSetupOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Instagram veilig activeren</DialogTitle>
            <DialogDescription>De Instagram-app is klaar. Alleen het geheime App Secret ontbreekt nog in de beveiligde serverconfiguratie.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <ol className="list-decimal space-y-2 pl-5 text-slate-700">
              <li>Open lokaal het bestand <strong>.env.local</strong>.</li>
              <li>Voeg <strong>INSTAGRAM_APP_ID</strong> en <strong>INSTAGRAM_APP_SECRET</strong> toe.</li>
              <li>Herstart daarna de lokale app.</li>
            </ol>
            <div className="space-y-2 rounded-xl border border-border bg-slate-50 p-3 font-mono text-xs text-slate-700">
              <p className="break-all">INSTAGRAM_APP_ID=1753986322424167</p>
              <p className="break-all">https://simplyapp.be/api/integrations/instagram/callback</p>
            </div>
            <p className="text-xs text-muted-foreground">De App Secret mag niet in een screenshot, e-mail of openbaar document worden geplaatst.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setMetaSetupOpen(false)}>Sluiten</Button>
            <Button asChild><a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer">Open Meta Developers<ExternalLink className="ml-2 h-4 w-4" /></a></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterMenu({
  categories,
  hiddenCategoryIds,
  onToggle,
  onReset,
}: {
  categories: Category[];
  hiddenCategoryIds: Set<string>;
  onToggle: (id: string) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const activeFilterCount = hiddenCategoryIds.size;

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((value) => !value)}>
        <Filter className="mr-2 h-4 w-4" />
        Filter
        {activeFilterCount > 0 ? (
          <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">{activeFilterCount}</span>
        ) : null}
      </Button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Sluit filter" />
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
            <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Hoeken tonen</p>
            <div className="space-y-1">
              {categories.map((category) => {
                const swatch = swatchFor(category.color);
                const visible = !hiddenCategoryIds.has(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onToggle(category.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                  >
                    <span className={cn("flex h-4 w-4 items-center justify-center rounded border", visible ? cn(swatch.border, swatch.bg) : "border-slate-300 bg-white")}>
                      {visible ? <Check className={cn("h-3 w-3", swatch.text)} /> : null}
                    </span>
                    <span className={cn("h-2 w-2 rounded-full", swatch.dot)} />
                    <span className="flex-1 truncate text-slate-700">{category.name}</span>
                  </button>
                );
              })}
              {categories.length === 0 ? <p className="px-2 py-1.5 text-xs text-muted-foreground">Nog geen hoeken aangemaakt.</p> : null}
            </div>
            {activeFilterCount > 0 ? (
              <button type="button" onClick={onReset} className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-primary hover:bg-primary/5">
                Toon alles
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
