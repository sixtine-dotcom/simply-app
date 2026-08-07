"use client";

import { useState, type DragEvent } from "react";
import { Film, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Category, swatchFor } from "./categories";
import { ContentDraft, ContentPublication, DriveVideo, displayMediaName, platformMeta } from "./types";

export type ScheduledItem = { draft: ContentDraft; publication: ContentPublication };

export function isoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dragPayload(videoId: string, publicationId: string) {
  return JSON.stringify({ videoId, publicationId });
}

function readDragPayload(e: DragEvent): { videoId: string; publicationId: string } | null {
  try {
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

type SharedProps = {
  categories: Category[];
  onSelect: (draft: ContentDraft) => void;
  onQuickAdd: (date: string) => void;
  onReschedule: (videoId: string, publicationId: string, dateKey: string) => void;
};

// ---------- Month ----------

export function MonthGrid({
  month,
  scheduled,
  categories,
  onSelect,
  onQuickAdd,
  onReschedule,
}: SharedProps & { month: Date; scheduled: ScheduledItem[] }) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const today = new Date();
  const firstWeekday = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => (index < firstWeekday ? null : index - firstWeekday + 1));
  while (cells.length % 7) cells.push(null);

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  // Three complete post cards always remain visible in a month cell.
  const VISIBLE_LIMIT = 3;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="grid grid-cols-7 bg-slate-50">
        {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((day) => (
          <div key={day} className="border-b border-r border-slate-200 p-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 last:border-r-0">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, index) => {
          const dateKey = day ? isoDate(new Date(month.getFullYear(), month.getMonth(), day)) : `empty-${index}`;
          const dayItems = day
            ? scheduled
                .filter(({ publication }) => isoDate(new Date(publication.scheduledAt)) === dateKey)
                .sort((a, b) => a.publication.scheduledAt.localeCompare(b.publication.scheduledAt))
            : [];
          const isToday = day ? isoDate(today) === dateKey : false;
          const expanded = expandedDays.has(dateKey);
          const visibleItems = expanded ? dayItems : dayItems.slice(0, VISIBLE_LIMIT);
          const hiddenCount = dayItems.length - visibleItems.length;

          return (
            <div
              key={dateKey}
              onDragOver={
                day
                  ? (e) => {
                      e.preventDefault();
                      setDragOverKey(dateKey);
                    }
                  : undefined
              }
              onDragLeave={day ? () => setDragOverKey((current) => (current === dateKey ? null : current)) : undefined}
              onDrop={
                day
                  ? (e) => {
                      e.preventDefault();
                      setDragOverKey(null);
                      const payload = readDragPayload(e);
                      if (payload) onReschedule(payload.videoId, payload.publicationId, dateKey);
                    }
                  : undefined
              }
              className={cn(
                "group relative min-h-[190px] border-b border-r border-slate-200 bg-white p-1.5 transition-colors last:border-r-0 hover:bg-slate-50/60",
                (index + 1) % 7 === 0 && "border-r-0",
                !day && "bg-slate-50/40",
                dragOverKey === dateKey && "bg-primary/5 ring-1 ring-inset ring-primary/30"
              )}
            >
              {day ? (
                <>
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                        isToday ? "bg-primary font-semibold text-white" : "text-slate-500"
                      )}
                    >
                      {day}
                    </span>
                    <button
                      type="button"
                      onClick={() => onQuickAdd(dateKey)}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 opacity-0 transition-opacity hover:bg-primary/10 hover:text-primary group-hover:opacity-100"
                      title="Post toevoegen op deze dag"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {visibleItems.map(({ draft, publication }) => {
                      const category = categoryById.get(draft.categoryId);
                      const swatch = swatchFor(category?.color ?? "slate");
                      return (
                        <ScheduledChip
                          key={publication.id}
                          video={draft.video}
                          publication={publication}
                          categoryName={category?.name ?? "Zonder hoek"}
                          swatch={swatch}
                          onClick={() => onSelect(draft)}
                        />
                      );
                    })}
                    {hiddenCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => setExpandedDays((current) => new Set(current).add(dateKey))}
                        className="block w-full rounded-md py-0.5 text-left text-[10px] font-medium text-primary hover:underline"
                      >
                        +{hiddenCount} meer
                      </button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScheduledChip({
  video,
  publication,
  categoryName,
  swatch,
  onClick,
}: {
  video: DriveVideo;
  publication: ContentPublication;
  categoryName: string;
  swatch: ReturnType<typeof swatchFor>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/json", dragPayload(video.id, publication.id));
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onClick}
      title={displayMediaName(video.name)}
      className="relative flex w-full cursor-grab items-center gap-1.5 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 pl-2 pr-1.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", swatch.dot)} />
      {video.thumbnailLink ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={video.thumbnailLink} alt="" className="h-6 w-8 shrink-0 rounded object-cover" />
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-700">
          {new Date(publication.scheduledAt).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
          <span className="ml-auto flex items-center gap-0.5 text-slate-400">
            {publication.platforms.map((item) => {
              const meta = platformMeta(item);
              const Icon = meta.icon;
              return <Icon key={item} className="h-2.5 w-2.5" />;
            })}
          </span>
        </span>
        <span className="block truncate text-[11px] font-semibold text-slate-800">{displayMediaName(video.name)}</span>
        <span className={cn("block truncate text-[9px]", swatch.text)}>{categoryName}</span>
      </span>
    </button>
  );
}

// ---------- Week ----------

export function WeekBoard({
  weekStart,
  scheduled,
  categories,
  onSelect,
  onQuickAdd,
  onReschedule,
}: SharedProps & { weekStart: Date; scheduled: ScheduledItem[] }) {
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const slots = Array.from({ length: 16 }, (_, index) => ({ hour: 6 + index }));
  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <div className="min-w-[1240px]">
        <div className="sticky top-0 z-10 grid grid-cols-[72px_repeat(7,minmax(0,1fr))] bg-white">
          <div className="border-b border-r border-slate-200 bg-slate-50" />
          {days.map((date) => {
            const isToday = isoDate(today) === isoDate(date);
            return <div key={isoDate(date)} className={cn("border-b border-r border-slate-200 px-2 py-3 text-center last:border-r-0", isToday && "bg-primary text-white")}><p className={cn("text-[10px] font-semibold uppercase tracking-wide", isToday ? "text-white/75" : "text-slate-400")}>{date.toLocaleDateString("nl-BE", { weekday: "long" })}</p><p className="mt-0.5 text-sm font-semibold">{date.getDate()} {date.toLocaleDateString("nl-BE", { month: "short" })}</p></div>;
          })}
        </div>

        {slots.map((slot) => {
          const label = `${pad(slot.hour)}:00`;
          return <div key={label} className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))]">
            <div className="border-b border-r border-slate-200 bg-slate-50/80 px-2 pt-1 text-right text-[10px] font-medium text-slate-400">{label}</div>
            {days.map((date) => {
              const dateKey = isoDate(date);
              return <div key={`${dateKey}-${slot.hour}`} className="border-b border-r border-slate-200 last:border-r-0">{[0, 30].map((minute) => {
                const halfLabel = `${pad(slot.hour)}:${pad(minute)}`;
                const dateTimeKey = `${dateKey}T${halfLabel}`;
                const cellItems = scheduled.filter(({ publication }) => {
                  const value = new Date(publication.scheduledAt);
                  return isoDate(value) === dateKey && value.getHours() === slot.hour && (value.getMinutes() < 30 ? 0 : 30) === minute;
                });
                return <div key={dateTimeKey} onDragOver={(event) => { event.preventDefault(); setDragOverKey(dateTimeKey); }} onDragLeave={() => setDragOverKey((current) => current === dateTimeKey ? null : current)} onDrop={(event) => { event.preventDefault(); setDragOverKey(null); const payload = readDragPayload(event); if (payload) onReschedule(payload.videoId, payload.publicationId, dateTimeKey); }} className={cn("group relative min-h-8 p-1 transition-colors hover:bg-primary/[0.03]", minute === 0 && "border-b border-dashed border-slate-200", dragOverKey === dateTimeKey && "bg-primary/10 ring-1 ring-inset ring-primary/30")}>
                  <button type="button" onClick={() => onQuickAdd(dateTimeKey)} className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100" aria-label={`Post toevoegen op ${dateTimeKey}`}><Plus className="absolute right-1 top-1 h-3 w-3 text-primary/50" /></button>
                  <div className="pointer-events-none relative z-[1] space-y-1">{cellItems.map(({ draft, publication }) => {
                    const category = categoryById.get(draft.categoryId);
                    const swatch = swatchFor(category?.color ?? "slate");
                    return <button key={publication.id} type="button" draggable onDragStart={(event) => { event.dataTransfer.setData("application/json", dragPayload(draft.video.id, publication.id)); event.dataTransfer.effectAllowed = "move"; }} onClick={() => onSelect(draft)} className={cn("pointer-events-auto flex w-full cursor-grab items-center gap-1 rounded-md border px-1.5 py-0.5 text-left text-[10px] shadow-sm active:cursor-grabbing", swatch.bg, swatch.border, swatch.text)}><span className="shrink-0 font-semibold">{halfLabel}</span><span className="truncate font-semibold">{displayMediaName(draft.video.name)}</span><span className="ml-auto shrink-0">{publication.platforms.map((item) => item === "instagram" ? "IG" : "FB").join("+")}</span></button>;
                  })}</div>
                </div>;
              })}</div>;
            })}
          </div>;
        })}
        <div className="grid grid-cols-[72px_1fr] bg-slate-50/70"><div className="border-r border-slate-200 px-2 py-1 text-right text-[10px] font-medium text-slate-400">22:00</div><div /></div>
      </div>
    </div>
  );
}

// ---------- Day ----------

export function DayAgenda({
  date,
  scheduled,
  categories,
  onSelect,
  onQuickAdd,
}: Omit<SharedProps, "onReschedule"> & { date: Date; scheduled: ScheduledItem[] }) {
  const dateKey = isoDate(date);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const dayItems = scheduled
    .filter(({ publication }) => isoDate(new Date(publication.scheduledAt)) === dateKey)
    .sort((a, b) => a.publication.scheduledAt.localeCompare(b.publication.scheduledAt));

  if (!dayItems.length) {
    return (
      <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 text-center">
        <p className="text-sm font-medium text-slate-900">Niets gepland op deze dag</p>
        <button
          type="button"
          onClick={() => onQuickAdd(dateKey)}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
        >
          <Plus className="h-3.5 w-3.5" />
          Post toevoegen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {dayItems.map(({ draft, publication }) => {
        const category = categoryById.get(draft.categoryId);
        const swatch = swatchFor(category?.color ?? "slate");
        return (
          <DetailedPostCard
            key={publication.id}
            draft={draft}
            publication={publication}
            categoryName={category?.name ?? "Zonder hoek"}
            swatch={swatch}
            onClick={() => onSelect(draft)}
            large
          />
        );
      })}
    </div>
  );
}

function DetailedPostCard({
  draft,
  publication,
  categoryName,
  swatch,
  onClick,
  large,
}: {
  draft: ContentDraft;
  publication: ContentPublication;
  categoryName: string;
  swatch: ReturnType<typeof swatchFor>;
  onClick: () => void;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      draggable={!large}
      onDragStart={
        !large
          ? (e) => {
              e.dataTransfer.setData("application/json", dragPayload(draft.video.id, publication.id));
              e.dataTransfer.effectAllowed = "move";
            }
          : undefined
      }
      onClick={onClick}
      className={cn(
        "relative flex w-full items-start gap-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        !large && "cursor-grab active:cursor-grabbing",
        large && "p-3"
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", swatch.dot)} />
      {draft.video.thumbnailLink ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={draft.video.thumbnailLink} alt="" className={cn("shrink-0 rounded-lg object-cover", large ? "h-14 w-20" : "h-10 w-14")} />
      ) : (
        <span className={cn("flex shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400", large ? "h-14 w-20" : "h-10 w-14")}>
          <Film className="h-4 w-4" />
        </span>
      )}
      <span className="min-w-0 flex-1 pl-1">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          {new Date(publication.scheduledAt).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
          <span className="ml-auto flex items-center gap-1 text-slate-400">
            {publication.platforms.map((item) => {
              const meta = platformMeta(item);
              const Icon = meta.icon;
              return <Icon key={item} className="h-3 w-3" />;
            })}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-slate-800">{displayMediaName(draft.video.name)}</span>
        <span className={cn("mt-0.5 flex items-center gap-1.5 truncate text-[11px] font-medium", swatch.text)}>
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", swatch.dot)} />
          {categoryName}
        </span>
        {large && publication.caption ? <span className="mt-1 line-clamp-2 block text-xs text-slate-500">{publication.caption}</span> : null}
      </span>
    </button>
  );
}
