"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, LayoutGrid, List, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { VIDEO_MODE_LABELS, VideoMode, VideoProjectStatus, VideoStep, isPostable } from "@/lib/video-studio-shared";
import { StatusBadge, StepBar } from "./video-ui";

export type VideoListItem = {
  id: string;
  title: string;
  slug: string;
  mode: VideoMode;
  status: VideoProjectStatus;
  steps: VideoStep[];
  latestVersion: number | null;
  openComments: number;
  createdAt: string;
  finalReady: boolean;
  publishStatus: string | null;
  scheduledAt: string | null;
  /** "Course › Lesson" for every lesson that uses this video. */
  usedIn: string[];
};

const shortDate = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Status shown in the list: after approval, the publishing state matters more than the edit state. */
function StatusCell({ item }: { item: VideoListItem }) {
  const pill = (label: string, className: string) => (
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", className)}>{label}</span>
  );
  if (item.publishStatus === "PUBLISHED") return pill("Gepubliceerd", "bg-[#385739] text-white");
  if (item.publishStatus === "PUBLISHING") return pill("Wordt gepubliceerd", "bg-amber-100 text-amber-800");
  if (item.publishStatus === "FAILED") return pill("Publiceren mislukt", "bg-red-100 text-red-700");
  if (item.publishStatus === "SCHEDULED" && item.scheduledAt)
    return pill(`Ingepland ${shortDate.format(new Date(item.scheduledAt))}`, "bg-sky-100 text-sky-800");
  if (item.status === "APPROVED" && isPostable(item.mode))
    return item.finalReady ? pill("Klaar om te publiceren", "bg-emerald-100 text-emerald-800") : pill("Eindversie wordt gemaakt", "bg-amber-100 text-amber-800");
  if (item.mode === "COURSE" && item.usedIn.length > 0)
    return (
      <span title={item.usedIn.join("\n")} className="shrink-0 rounded-full bg-[#385739] px-2.5 py-1 text-xs font-medium text-white">
        In cursus{item.usedIn.length > 1 ? ` (${item.usedIn.length}×)` : ""}
      </span>
    );
  if (item.status === "APPROVED" && item.mode === "COURSE")
    return item.finalReady ? pill("Nagekeken", "bg-emerald-100 text-emerald-800") : pill("Eindversie wordt gemaakt", "bg-amber-100 text-amber-800");
  return <StatusBadge status={item.status} />;
}

type View = "list" | "grid";
const VIEW_KEY = "video-studio-view";
const FILTER_KEY = "video-studio-mode-filter";
type ModeFilter = "SOCIAL" | "COURSE" | "ALL";

function versionLabel(n: number | null) {
  return n ? `v${String(n).padStart(3, "0")}` : "—";
}

function StepDots({ steps }: { steps: VideoStep[] }) {
  return (
    <span className="flex items-center gap-1" title={steps.map((s) => `${s.label}: ${s.status}`).join("\n")}>
      {steps.map((step) => (
        <span
          key={step.key}
          className={cn(
            "h-1.5 w-4 rounded-full",
            step.status === "done" && "bg-emerald-500",
            step.status === "running" && "animate-pulse bg-amber-400",
            step.status === "failed" && "bg-red-500",
            step.status === "pending" && "bg-slate-200"
          )}
        />
      ))}
    </span>
  );
}

export function VideoList({ items }: { items: VideoListItem[] }) {
  const router = useRouter();
  const [view, setView] = useState<View>("list");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("SOCIAL");
  // "Kant-en-klaar" videos are social posts too, so they show under Social.
  const inFilter = (item: VideoListItem, filter: "SOCIAL" | "COURSE") => (filter === "SOCIAL" ? isPostable(item.mode) : item.mode === "COURSE");
  const filtered = modeFilter === "ALL" ? items : items.filter((item) => inFilter(item, modeFilter));
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState<VideoListItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "grid" || saved === "list") setView(saved);
      const savedFilter = localStorage.getItem(FILTER_KEY);
      if (savedFilter === "SOCIAL" || savedFilter === "COURSE" || savedFilter === "ALL") setModeFilter(savedFilter);
    } catch {
      // storage unavailable: keep the default
    }
  }, []);

  function changeView(next: View) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // ignore
    }
  }

  async function patch(id: string, body: object, method = "PATCH") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/video/${id}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "PATCH" ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Er ging iets mis");
      return false;
    }
    router.refresh();
    return true;
  }

  async function saveRename() {
    if (!renaming) return;
    if (await patch(renaming.id, { action: "rename", title: renaming.title })) setRenaming(null);
  }

  // Plain render helpers (not components) so the rename input keeps focus while typing.
  function renderActions(item: VideoListItem) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={`/admin/content/video/${item.id}`}
          className="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Openen
        </Link>
        <button
          type="button"
          onClick={() => setRenaming({ id: item.id, title: item.title })}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label={`Naam wijzigen: ${item.title}`}
          title="Naam wijzigen"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setDeleting(item)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600"
          aria-label={`Verwijderen: ${item.title}`}
          title="Verwijderen"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  function renderTitle(item: VideoListItem) {
    if (renaming?.id === item.id) {
      return (
        <form
          className="flex min-w-0 flex-1 items-center gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            void saveRename();
          }}
        >
          <Input
            autoFocus
            value={renaming.title}
            onChange={(event) => setRenaming({ ...renaming, title: event.target.value })}
            onKeyDown={(event) => event.key === "Escape" && setRenaming(null)}
            className="h-8"
            aria-label="Nieuwe titel"
          />
          <button type="submit" disabled={busy} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100" aria-label="Opslaan">
            <Check className="h-4 w-4 text-emerald-600" />
          </button>
          <button type="button" onClick={() => setRenaming(null)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100" aria-label="Annuleren">
            <X className="h-4 w-4" />
          </button>
        </form>
      );
    }
    return (
      <Link href={`/admin/content/video/${item.id}`} title={item.title} className="min-w-0 truncate font-semibold text-slate-950 hover:underline">
        {item.title}
      </Link>
    );
  }

  function renderGroup(groupItems: VideoListItem[]) {
    return (
      <>
      {view === "list" ? (
        <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/85">
          <div className="hidden grid-cols-[minmax(220px,1fr)_80px_190px_100px_60px_90px_190px] items-center gap-4 border-b border-slate-200 px-5 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid">
            <span>Titel</span>
            <span>Soort</span>
            <span>Status</span>
            <span>Voortgang</span>
            <span>Versie</span>
            <span>Aangemaakt</span>
            <span className="sr-only">Acties</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {groupItems.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-slate-50/70 md:grid-cols-[minmax(220px,1fr)_80px_190px_100px_60px_90px_190px]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {renderTitle(item)}
                  {item.openComments > 0 ? (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">
                      {item.openComments} open
                    </span>
                  ) : null}
                </div>
                <span className="hidden text-xs text-slate-600 md:block">{VIDEO_MODE_LABELS[item.mode] ?? item.mode}</span>
                <span className="hidden md:block">
                  <StatusCell item={item} />
                </span>
                <span className="hidden md:block">
                  <StepDots steps={item.steps} />
                </span>
                <span className="hidden font-mono text-xs text-slate-600 md:block">{versionLabel(item.latestVersion)}</span>
                <span className="hidden text-xs text-slate-600 md:block">
                  {new Date(item.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                </span>
                <div className="row-span-2 md:row-span-1">
                  {renderActions(item)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground md:hidden">
                  <StatusCell item={item} />
                  <span>{VIDEO_MODE_LABELS[item.mode]}</span>
                  <span className="font-mono">{versionLabel(item.latestVersion)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groupItems.map((item) => (
            <div key={item.id} className="app-panel flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/85 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {renderTitle(item)}
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {VIDEO_MODE_LABELS[item.mode]} · {item.slug}
                  </p>
                </div>
                <StatusCell item={item} />
              </div>
              <StepBar steps={item.steps} compact />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {versionLabel(item.latestVersion)}
                  {item.openComments > 0 ? ` · ${item.openComments} open` : ""}
                </span>
                {renderActions(item)}
              </div>
            </div>
          ))}
        </div>
      )}

      </>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex rounded-full border border-slate-200 bg-white p-1" role="radiogroup" aria-label="Soort video's">
          {(
            [
              ["SOCIAL", "Social"],
              ["COURSE", "Cursus"],
              ["ALL", "Alles"],
            ] as const
          ).map(([key, label]) => {
            const count = key === "ALL" ? items.length : items.filter((item) => inFilter(item, key)).length;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={modeFilter === key}
                onClick={() => {
                  setModeFilter(key);
                  try {
                    localStorage.setItem(FILTER_KEY, key);
                  } catch {
                    // ignore
                  }
                }}
                className={cn("rounded-full px-4 py-1.5 text-sm", modeFilter === key ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900")}
              >
                {label} <span className="opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex rounded-full border border-slate-200 bg-white p-1" role="radiogroup" aria-label="Weergave">
          {(
            [
              ["list", List, "Lijst"],
              ["grid", LayoutGrid, "Blokken"],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={view === key}
              onClick={() => changeView(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs",
                view === key ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {modeFilter === "ALL" ? (
        (["SOCIAL", "COURSE"] as const).map((mode) => {
          const groupItems = items.filter((item) => inFilter(item, mode));
          if (groupItems.length === 0) return null;
          return (
            <section key={mode} className="space-y-2">
              <h2 className="px-1 text-sm font-semibold text-slate-900">
                {VIDEO_MODE_LABELS[mode]} <span className="font-normal text-muted-foreground">({groupItems.length})</span>
              </h2>
              {renderGroup(groupItems)}
            </section>
          );
        })
      ) : filtered.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-muted-foreground">
          Nog geen {modeFilter === "SOCIAL" ? "social" : "cursus"}video&apos;s.
        </p>
      ) : (
        renderGroup(filtered)
      )}

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Video verwijderen?</DialogTitle>
            <DialogDescription>
              “{deleting?.title}” verdwijnt uit de app, met alle versies en opmerkingen. De map op je Mac
              ({deleting?.mode === "COURSE" ? "Lesmateriaal" : "Content"}/{deleting?.slug}) blijft staan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Annuleren
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (deleting && (await patch(deleting.id, {}, "DELETE"))) setDeleting(null);
              }}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
