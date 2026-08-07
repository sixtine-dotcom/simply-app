import { requireAdminOrCoachUser } from "@/lib/auth";
import { getUserSessions } from "@/lib/coaching";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SessionScheduleDialog } from "@/components/coaching/session-schedule-dialog";
import { InstantMeetingButton } from "@/components/coaching/instant-meeting-button";
import {
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  PanelLeft,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";

type CalendarView = "day" | "workweek" | "month" | "hidden";

type CalendarItem = {
  id: string;
  type: "simply" | "external";
  title: string;
  subtitle: string;
  startsAt: Date;
  endsAt: Date;
  href?: string | null;
};

const VIEW_LABELS: Array<{ value: CalendarView; label: string }> = [
  { value: "day", label: "Dag" },
  { value: "workweek", label: "Werkweek" },
  { value: "month", label: "Maand" },
  { value: "hidden", label: "Verberg" },
];

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; date?: string }>;
}) {
  const user = await requireAdminOrCoachUser("/admin/sessions");
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const view = normalizeView(resolvedSearchParams?.view);
  const anchorDate = parseDateParam(resolvedSearchParams?.date) ?? new Date();
  const range = getViewRange(view, anchorDate);

  const [allSessions, calendarConnections, externalEvents] = await Promise.all([
    getUserSessions(user.id, user.role as "COACH" | "ADMIN", user.tenantId, {
      status: "all",
      limit: 500,
    }),
    db.calendarConnection.findMany({
      where: { userId: user.id, syncEnabled: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.externalCalendarEvent.findMany({
      where: {
        userId: user.id,
        startsAt: { gte: range.start, lte: range.end },
      },
      orderBy: { startsAt: "asc" },
      take: 200,
    }),
  ]);

  const simplyItems: CalendarItem[] = allSessions
    .filter((session) => session.status === "scheduled")
    .map((session) => {
      const startsAt = new Date(session.scheduledAt);
      return {
        id: session.id,
        type: "simply" as const,
        title: session.title || "Coaching sessie",
        subtitle:
          session.externalAttendeeEmails.length > 0 && session.client.id === session.coach.id
            ? `${session.externalAttendeeEmails.length} externe deelnemer${session.externalAttendeeEmails.length === 1 ? "" : "s"}`
            : [
                `${session.client.firstName} ${session.client.lastName}`.trim(),
                session.externalAttendeeEmails.length > 0
                  ? `+ ${session.externalAttendeeEmails.length} extern`
                  : null,
              ]
                .filter(Boolean)
                .join(" "),
        startsAt,
        endsAt: new Date(startsAt.getTime() + session.duration * 60000),
        href: `/admin/sessions/${session.id}`,
      };
    })
    .filter((item) => item.endsAt >= range.start && item.startsAt <= range.end);

  const externalItems: CalendarItem[] = externalEvents.map((event) => ({
    id: event.id,
    type: "external" as const,
    title: event.title,
    subtitle: event.provider,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    href: event.externalUrl,
  }));

  const items = [...simplyItems, ...externalItems].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime()
  );
  const scheduleDialogItems = items.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    type: item.type,
    startsAt: item.startsAt.toISOString(),
    endsAt: item.endsAt.toISOString(),
  }));

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f5f5f5] text-[#242424]">
      <div className="flex h-14 items-center gap-4 border-b bg-[#e9f2f2] px-5">
        <PanelLeft className="h-4 w-4 text-[#616161]" />
        <div className="mx-auto flex h-9 w-full max-w-2xl items-center gap-3 rounded-md bg-white px-4 text-sm text-[#616161] shadow-sm">
          <Search className="h-4 w-4" />
          <span>Zoeken</span>
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-120px)] grid-cols-1 bg-white lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r bg-[#fafafa] px-6 py-6 lg:block">
          <h1 className="mb-8 text-2xl font-semibold">Agenda</h1>
          <MiniMonth anchorDate={anchorDate} />

          <div className="mt-8 border-t pt-5">
            <Link
              href="/api/calendar/connect/google"
              className="flex items-center gap-3 text-sm font-medium text-[#12483b]"
            >
              <CalendarPlus className="h-5 w-5" />
              Agenda toevoegen
            </Link>
          </div>

          <div className="mt-8 space-y-4 border-t pt-5">
            <p className="text-sm font-semibold">Mijn agenda&apos;s</p>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="h-5 w-5 fill-[#12483b] text-white" />
              <span>Agenda</span>
            </div>
            {calendarConnections.length === 0 ? (
              <div className="space-y-2 pt-2 text-sm text-[#616161]">
                <p>Koppel Google of Outlook om externe afspraken te tonen.</p>
                <div className="flex gap-3">
                  <Link href="/api/calendar/connect/google" className="font-medium text-[#12483b]">
                    Google
                  </Link>
                  <Link href="/api/calendar/connect/microsoft" className="font-medium text-[#12483b]">
                    Outlook
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        <main className="min-w-0">
          <div className="flex h-16 items-center justify-between border-b bg-white px-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={buildAgendaHref({ view, date: addDays(anchorDate, getPreviousStep(view)) })}>
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={buildAgendaHref({ view, date: addDays(anchorDate, getNextStep(view)) })}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={buildAgendaHref({ view, date: new Date() })}>Vandaag</Link>
              </Button>
              <h2 className="ml-4 text-lg font-semibold">{formatRangeLabel(view, anchorDate)}</h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-1 md:flex">
                {VIEW_LABELS.filter((option) => option.value !== "hidden").map((option) => (
                  <Link
                    key={option.value}
                    href={buildAgendaHref({ view: option.value, date: anchorDate })}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium",
                      view === option.value
                        ? "bg-[#e7f1ed] text-[#12483b]"
                        : "text-[#424242] hover:bg-[#f5f5f5]"
                    )}
                  >
                    {option.label === "Werkweek" ? "Week" : option.label}
                  </Link>
                ))}
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/api/calendar/sync">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync
                </Link>
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <InstantMeetingButton
                defaultTitle={`Vergadering met ${[user.firstName, user.lastName].filter(Boolean).join(" ") || "coach"}`}
              />
              <SessionScheduleDialog items={scheduleDialogItems} />
            </div>
          </div>

          <div className="bg-white">
            {view === "hidden" ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Agenda verborgen.</div>
            ) : view === "month" ? (
              <MonthCalendar anchorDate={anchorDate} items={items} />
            ) : view === "workweek" ? (
              <WeekCalendar startDate={startOfWorkweek(anchorDate)} items={items} />
            ) : (
              <DayCalendar date={anchorDate} items={items} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function buildNewEventHref(input: { view: CalendarView; date: Date; time: string }) {
  const params = new URLSearchParams();
  const date = toDateParam(input.date);
  params.set("view", input.view);
  params.set("date", date);
  params.set("newEvent", "individual");
  params.set("slotDate", date);
  params.set("start", input.time);
  return `/admin/sessions?${params.toString()}`;
}

function DayCalendar({ date, items }: { date: Date; items: CalendarItem[] }) {
  const dayItems = items.filter((item) => isSameDay(item.startsAt, date));

  return (
    <div className="rounded-lg border bg-background">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium">{formatFullDate(date)}</p>
      </div>
      <div className="divide-y">
        {Array.from({ length: 14 }, (_, index) => index + 7).map((hour) => {
          const hourItems = dayItems.filter((item) => item.startsAt.getHours() === hour);
          return (
            <div key={hour} className="grid min-h-20 grid-cols-[70px_1fr]">
              <div className="border-r px-3 py-3 text-xs text-muted-foreground">
                {String(hour).padStart(2, "0")}:00
              </div>
              <div className="relative space-y-2 p-2">
                <Link
                  href={buildNewEventHref({ view: "day", date, time: `${String(hour).padStart(2, "0")}:00` })}
                  className="absolute left-0 right-0 top-0 h-1/2 rounded-sm hover:bg-[#e7f1ed]"
                  aria-label={`Nieuwe gebeurtenis om ${hour}:00`}
                />
                <Link
                  href={buildNewEventHref({ view: "day", date, time: `${String(hour).padStart(2, "0")}:30` })}
                  className="absolute bottom-0 left-0 right-0 h-1/2 rounded-sm hover:bg-[#e7f1ed]"
                  aria-label={`Nieuwe gebeurtenis om ${hour}:30`}
                />
                <div className="relative z-10 space-y-2">
                  {hourItems.map((item) => (
                    <CalendarEvent key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        {dayItems.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted-foreground">Geen afspraken op deze dag.</div>
        ) : null}
      </div>
    </div>
  );
}

function MiniMonth({ anchorDate }: { anchorDate: Date }) {
  const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-medium">
          {anchorDate.toLocaleDateString("nl-NL", { month: "long", year: "numeric" })}
        </p>
        <div className="flex gap-1">
          <Link
            href={buildAgendaHref({ view: "workweek", date: addDays(anchorDate, -30) })}
            className="rounded p-1 text-[#616161] hover:bg-[#ededed]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href={buildAgendaHref({ view: "workweek", date: addDays(anchorDate, 30) })}
            className="rounded p-1 text-[#616161] hover:bg-[#ededed]"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {["m", "d", "w", "d", "v", "z", "z"].map((day, index) => (
          <div key={`${day}-${index}`} className="pb-2 text-xs font-medium text-[#616161]">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const isCurrentMonth = day.getMonth() === anchorDate.getMonth();
          const isSelected = isSameDay(day, anchorDate);
          const isToday = isSameDay(day, new Date());
          return (
            <Link
              key={day.toISOString()}
              href={buildAgendaHref({ view: "workweek", date: day })}
              className={cn(
                "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm",
                !isCurrentMonth && "text-[#8a8a8a]",
                isSelected && "bg-[#12483b] text-white",
                !isSelected && isToday && "font-semibold text-[#12483b]",
                !isSelected && "hover:bg-[#ededed]"
              )}
            >
              {day.getDate()}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function WeekCalendar({ startDate, items }: { startDate: Date; items: CalendarItem[] }) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(startDate, index));
  const hours = Array.from({ length: 15 }, (_, index) => index + 7);

  return (
    <div className="overflow-x-auto bg-white">
      <div className="grid min-w-[980px] grid-cols-[56px_repeat(7,minmax(130px,1fr))]">
        <div className="sticky left-0 z-10 border-r border-b bg-white" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "border-r border-b px-4 py-3 last:border-r-0",
              isSameDay(day, new Date()) && "border-t-4 border-t-[#12483b] bg-[#e7f1ed]"
            )}
          >
            <p className="text-xs text-muted-foreground">
              {day.toLocaleDateString("nl-NL", { weekday: "short" })}
            </p>
            <p
              className={cn(
                "mt-1 text-xl font-semibold",
                isSameDay(day, new Date()) && "text-[#12483b]"
              )}
            >
              {day.getDate()}
            </p>
          </div>
        ))}

        {hours.map((hour) => (
          <div key={`hour-${hour}`} className="contents">
            <div
              className="sticky left-0 z-10 min-h-[86px] border-r border-b bg-white px-2 py-2 text-right text-xs text-[#616161]"
            >
              {hour}:00
            </div>
            {days.map((day) => {
              const hourItems = items.filter(
                (item) => isSameDay(item.startsAt, day) && item.startsAt.getHours() === hour
              );
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className="relative min-h-[86px] border-r border-b bg-[linear-gradient(to_bottom,transparent_0,transparent_50%,rgba(229,229,229,0.7)_50%,rgba(229,229,229,0.7)_51%,transparent_51%)] p-1.5 last:border-r-0"
                >
                  <Link
                    href={buildNewEventHref({ view: "workweek", date: day, time: `${String(hour).padStart(2, "0")}:00` })}
                    className="absolute left-0 right-0 top-0 h-1/2 hover:bg-[#e7f1ed]"
                    aria-label={`Nieuwe gebeurtenis op ${formatFullDate(day)} om ${hour}:00`}
                  />
                  <Link
                    href={buildNewEventHref({ view: "workweek", date: day, time: `${String(hour).padStart(2, "0")}:30` })}
                    className="absolute bottom-0 left-0 right-0 h-1/2 hover:bg-[#e7f1ed]"
                    aria-label={`Nieuwe gebeurtenis op ${formatFullDate(day)} om ${hour}:30`}
                  />
                  <div className="relative z-10 space-y-1">
                    {hourItems.map((item) => (
                      <CalendarEvent key={item.id} item={item} compact />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthCalendar({ anchorDate, items }: { anchorDate: Date; items: CalendarItem[] }) {
  const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));

  return (
    <div className="rounded-lg border bg-background">
      <div className="border-b px-4 py-3">
        <p className="font-medium">
          {anchorDate.toLocaleDateString("nl-NL", { month: "long", year: "numeric" })}
        </p>
      </div>
      <div className="grid grid-cols-7 border-b text-xs font-medium text-muted-foreground">
        {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((day) => (
          <div key={day} className="border-r px-2 py-2 last:border-r-0">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayItems = items.filter((item) => isSameDay(item.startsAt, day)).slice(0, 3);
          const isCurrentMonth = day.getMonth() === anchorDate.getMonth();
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-32 border-r border-b p-2 last:border-r-0",
                !isCurrentMonth && "bg-muted/20 text-muted-foreground"
              )}
            >
              <p className="mb-2 text-sm font-medium">{day.getDate()}</p>
              <div className="space-y-1">
                {dayItems.map((item) => (
                  <CalendarEvent key={item.id} item={item} compact />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarEvent({ item, compact = false }: { item: CalendarItem; compact?: boolean }) {
  const content = (
    <div
      className={cn(
        "rounded-sm border-l-4 px-2 py-2 text-sm shadow-sm",
        item.type === "simply"
          ? "border-[#12483b] bg-[#e7f1ed] text-[#123b32]"
          : "border-slate-400 bg-slate-100 text-slate-900",
        compact && "truncate py-1.5 text-xs"
      )}
    >
      <p className={cn("font-medium", compact && "truncate")}>
        {compact ? `${formatTime(item.startsAt)} ${item.title}` : item.title}
      </p>
      {!compact ? (
        <p className="mt-1 text-xs opacity-80">
          {formatTime(item.startsAt)} - {formatTime(item.endsAt)} · {item.subtitle}
        </p>
      ) : null}
    </div>
  );

  return item.href ? (
    <Link href={item.href} target={item.type === "external" ? "_blank" : undefined}>
      {content}
    </Link>
  ) : (
    content
  );
}

function normalizeView(value?: string): CalendarView {
  if (value === "day" || value === "workweek" || value === "month" || value === "hidden") {
    return value;
  }
  return "workweek";
}

function parseDateParam(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildAgendaHref(input: { view: CalendarView; date: Date }) {
  const params = new URLSearchParams();
  params.set("view", input.view);
  params.set("date", toDateParam(input.date));
  return `/admin/sessions?${params.toString()}`;
}

function getViewRange(view: CalendarView, date: Date) {
  if (view === "month") {
    const start = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
    const end = addDays(start, 42);
    return { start, end };
  }
  if (view === "workweek") {
    const start = startOfWorkweek(date);
    return { start, end: endOfDay(addDays(start, 4)) };
  }
  return { start: startOfDay(date), end: endOfDay(date) };
}

function getPreviousStep(view: CalendarView) {
  if (view === "month") return -30;
  if (view === "workweek") return -7;
  return -1;
}

function getNextStep(view: CalendarView) {
  if (view === "month") return 30;
  if (view === "workweek") return 7;
  return 1;
}

function startOfWorkweek(date: Date) {
  return startOfWeek(date);
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateParam(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatFullDate(date: Date) {
  return date.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatRangeLabel(view: CalendarView, date: Date) {
  if (view === "month") {
    return date.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  }

  if (view === "workweek") {
    const start = startOfWorkweek(date);
    const end = addDays(start, 6);
    const sameMonth = start.getMonth() === end.getMonth();
    const startLabel = start.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: sameMonth ? undefined : "short",
    });
    const endLabel = end.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${startLabel} - ${endLabel}`;
  }

  return formatFullDate(date);
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
