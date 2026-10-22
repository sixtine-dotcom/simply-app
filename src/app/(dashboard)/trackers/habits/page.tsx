"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Apple,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Footprints,
  HeartPulse,
  Leaf,
  Loader2,
  Minus,
  Moon,
  Plus,
  Save,
  Sparkles,
  Watch,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

type CustomHabits = {
  sleepHours?: number;
  movementMinutes?: number;
  vegetableServings?: number;
  energy?: number;
  note?: string;
};

type HabitLog = {
  id: string;
  date: string;
  waterGlasses: number | null;
  steps: number | null;
  supplements: boolean | null;
  customHabits: CustomHabits | null;
};

type FormData = {
  waterGlasses: number;
  steps: number;
  supplements: boolean;
  sleepHours: number;
  movementMinutes: number;
  vegetableServings: number;
  energy: number;
  note: string;
};

const DEFAULT_FORM: FormData = {
  waterGlasses: 0,
  steps: 0,
  supplements: false,
  sleepHours: 0,
  movementMinutes: 0,
  vegetableServings: 0,
  energy: 3,
  note: "",
};

const GOALS = {
  waterGlasses: 8,
  steps: 8000,
  sleepHours: 8,
  movementMinutes: 30,
  vegetableServings: 5,
};

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const weekday = next.getDay() || 7;
  next.setDate(next.getDate() - weekday + 1);
  next.setHours(12, 0, 0, 0);
  return next;
}

function calculateScore(data: FormData) {
  const parts = [
    Math.min(data.waterGlasses / GOALS.waterGlasses, 1),
    Math.min(data.steps / GOALS.steps, 1),
    Math.min(data.sleepHours / GOALS.sleepHours, 1),
    Math.min(data.movementMinutes / GOALS.movementMinutes, 1),
    Math.min(data.vegetableServings / GOALS.vegetableServings, 1),
    data.supplements ? 1 : 0,
  ];
  return Math.round((parts.reduce((sum, part) => sum + part, 0) / parts.length) * 100);
}

function logScore(log?: HabitLog) {
  if (!log) return 0;
  return calculateScore({
    waterGlasses: log.waterGlasses ?? 0,
    steps: log.steps ?? 0,
    supplements: Boolean(log.supplements),
    sleepHours: Number(log.customHabits?.sleepHours ?? 0),
    movementMinutes: Number(log.customHabits?.movementMinutes ?? 0),
    vegetableServings: Number(log.customHabits?.vegetableServings ?? 0),
    energy: Number(log.customHabits?.energy ?? 3),
    note: String(log.customHabits?.note ?? ""),
  });
}

export default function HabitsPage() {
  const { toast } = useToast();
  const [date, setDate] = useState(localDateKey(new Date()));
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const selectedDate = useMemo(() => fromDateKey(date), [date]);
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  const loadHabitData = useCallback(async () => {
    setIsLoading(true);
    try {
      const rangeStart = addDays(weekStart, -21);
      const rangeEnd = addDays(weekStart, 6);
      const response = await fetch(
        `/api/trackers/habits?startDate=${rangeStart.toISOString()}&endDate=${rangeEnd.toISOString()}`
      );
      if (!response.ok) throw new Error("Je gewoontes konden niet worden geladen.");
      const data = (await response.json()) as HabitLog[];
      setLogs(data);
      const selected = data.find((log) => localDateKey(new Date(log.date)) === date);
      setFormData(
        selected
          ? {
              waterGlasses: selected.waterGlasses ?? 0,
              steps: selected.steps ?? 0,
              supplements: Boolean(selected.supplements),
              sleepHours: Number(selected.customHabits?.sleepHours ?? 0),
              movementMinutes: Number(selected.customHabits?.movementMinutes ?? 0),
              vegetableServings: Number(selected.customHabits?.vegetableServings ?? 0),
              energy: Number(selected.customHabits?.energy ?? 3),
              note: String(selected.customHabits?.note ?? ""),
            }
          : DEFAULT_FORM
      );
    } catch (error) {
      toast({
        title: "Laden mislukt",
        description: error instanceof Error ? error.message : "Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [date, toast, weekStart]);

  useEffect(() => {
    void loadHabitData();
  }, [loadHabitData]);

  const score = calculateScore(formData);
  const currentWeekLogs = weekDays.map((day) =>
    logs.find((log) => localDateKey(new Date(log.date)) === localDateKey(day))
  );
  const completedDays = currentWeekLogs.filter((log) => logScore(log) >= 60).length;
  const activeStreak = useMemo(() => {
    let streak = 0;
    for (let offset = 0; offset < 28; offset += 1) {
      const key = localDateKey(addDays(selectedDate, -offset));
      const log = logs.find((entry) => localDateKey(new Date(entry.date)) === key);
      if (!log || logScore(log) < 40) break;
      streak += 1;
    }
    return streak;
  }, [logs, selectedDate]);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saveDate = fromDateKey(date);
      const response = await fetch("/api/trackers/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: saveDate.toISOString(),
          waterGlasses: formData.waterGlasses,
          steps: formData.steps,
          supplements: formData.supplements,
          customHabits: {
            sleepHours: formData.sleepHours,
            movementMinutes: formData.movementMinutes,
            vegetableServings: formData.vegetableServings,
            energy: formData.energy,
            note: formData.note,
          },
        }),
      });
      if (!response.ok) throw new Error("Je dag kon niet worden opgeslagen.");
      toast({ title: "Dag opgeslagen", description: `Je dagelijkse score is ${score}%.` });
      await loadHabitData();
    } catch (error) {
      toast({
        title: "Opslaan mislukt",
        description: error instanceof Error ? error.message : "Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const previousDay = () => setDate(localDateKey(addDays(selectedDate, -1)));
  const nextDay = () => setDate(localDateKey(addDays(selectedDate, 1)));

  return (
    <div className="min-h-screen bg-white px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/trackers" className="mb-4 inline-flex items-center gap-2 text-xs text-[#6c746e] hover:text-[#173622]">
              <ArrowLeft className="h-3.5 w-3.5" /> Alle trackers
            </Link>
            <h1 className="text-[1.45rem] font-semibold tracking-[-0.025em] text-[#181d19]">Mijn dagelijkse ritme</h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-[#68706a]">
              Zie wat je lichaam ondersteunt en bouw stap voor stap een routine die je volhoudt.
            </p>
          </div>
          <div className="flex items-center border border-black/10 bg-white">
            <button type="button" onClick={previousDay} className="flex h-10 w-10 items-center justify-center border-r border-black/10 hover:bg-[#f7f8f5]" aria-label="Vorige dag">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <label className="relative flex h-10 min-w-[180px] items-center justify-center px-3 text-xs font-semibold capitalize">
              {new Intl.DateTimeFormat("nl-BE", { weekday: "short", day: "numeric", month: "long" }).format(selectedDate)}
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Kies een datum" />
            </label>
            <button type="button" onClick={nextDay} className="flex h-10 w-10 items-center justify-center border-l border-black/10 hover:bg-[#f7f8f5]" aria-label="Volgende dag">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        <section className="grid border-b border-black/10 lg:grid-cols-[1fr_280px]">
          <div className="py-7 lg:border-r lg:border-black/10 lg:pr-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[#6d746f]">Deze week</p>
                <h2 className="mt-1 text-lg font-semibold text-[#1a201b]">{completedDays} van 7 dagen op ritme</h2>
              </div>
              <p className="text-xs text-[#68706a]">{activeStreak} dagen reeks</p>
            </div>
            <div className="mt-6 grid grid-cols-7 gap-1.5">
              {weekDays.map((day, index) => {
                const dayScore = logScore(currentWeekLogs[index]);
                const selected = localDateKey(day) === date;
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setDate(localDateKey(day))}
                    className={cn(
                      "group border px-1 py-3 text-center transition",
                      selected ? "border-[#173622] bg-[#173622] text-white" : "border-black/10 bg-white hover:border-[#173622]/40"
                    )}
                  >
                    <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] opacity-65">
                      {new Intl.DateTimeFormat("nl-BE", { weekday: "short" }).format(day)}
                    </span>
                    <span className="mt-1 block text-sm font-semibold">{day.getDate()}</span>
                    <span className={cn("mx-auto mt-3 block h-1 w-7 bg-black/10", selected && "bg-white/20")}>
                      <span className={cn("block h-full bg-[#315f3d]", selected && "bg-white")} style={{ width: `${dayScore}%` }} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between py-7 lg:block lg:pl-8">
            <div>
              <p className="text-xs font-medium text-[#6d746f]">Dagelijkse score</p>
              <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-[#173622]">{score}%</p>
            </div>
            <div className="mt-0 h-1.5 w-36 bg-black/10 lg:mt-5 lg:w-full">
              <div className="h-full bg-[#173622] transition-[width] duration-500" style={{ width: `${score}%` }} />
            </div>
            <p className="mt-3 hidden text-xs leading-5 text-[#717873] lg:block">
              Geen perfectie nodig. Een consistente basis maakt het verschil.
            </p>
          </div>
        </section>

        {isLoading ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#173622]" />
          </div>
        ) : (
          <>
            <section className="py-8">
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#1a201b]">Vandaag</h2>
                  <p className="mt-1 text-xs text-[#747b76]">Tik, schuif of vul aan wat voor jou klopt.</p>
                </div>
                <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7d847f] sm:block">Automatisch opgeslagen na bevestigen</span>
              </div>

              <div className="divide-y divide-black/10 border-y border-black/10">
                <CounterRow icon={Droplet} title="Water" value={formData.waterGlasses} goal={`${GOALS.waterGlasses} glazen`} unit="glazen" onDecrease={() => update("waterGlasses", Math.max(0, formData.waterGlasses - 1))} onIncrease={() => update("waterGlasses", formData.waterGlasses + 1)} accent="text-[#347487]" />
                <NumberRow icon={Footprints} title="Stappen" value={formData.steps} goal={`${GOALS.steps.toLocaleString("nl-BE")} stappen`} step={500} onChange={(value) => update("steps", value)} accent="text-[#46655a]" />
                <NumberRow icon={Moon} title="Slaap" value={formData.sleepHours} goal={`${GOALS.sleepHours} uur`} step={0.5} onChange={(value) => update("sleepHours", value)} accent="text-[#555a77]" suffix="u" />
                <NumberRow icon={Activity} title="Beweging" value={formData.movementMinutes} goal={`${GOALS.movementMinutes} minuten`} step={5} onChange={(value) => update("movementMinutes", value)} accent="text-[#576d3e]" suffix="min" />
                <CounterRow icon={Leaf} title="Groenten" value={formData.vegetableServings} goal={`${GOALS.vegetableServings} porties`} unit="porties" onDecrease={() => update("vegetableServings", Math.max(0, formData.vegetableServings - 1))} onIncrease={() => update("vegetableServings", formData.vegetableServings + 1)} accent="text-[#3f7049]" />
                <ToggleRow icon={Sparkles} title="Suppletie" detail="Vandaag genomen" checked={formData.supplements} onChange={(value) => update("supplements", value)} />
              </div>
            </section>

            <section className="grid gap-8 border-t border-black/10 py-8 lg:grid-cols-[1fr_1fr]">
              <div>
                <h2 className="text-sm font-semibold">Hoe voelt je energie?</h2>
                <div className="mt-4 grid grid-cols-5 border border-black/10">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => update("energy", level)}
                      className={cn(
                        "flex h-12 items-center justify-center border-r border-black/10 text-xs last:border-r-0",
                        formData.energy === level ? "bg-[#173622] text-white" : "bg-white text-[#69716b] hover:bg-[#f7f8f5]"
                      )}
                      aria-label={`Energieniveau ${level} van 5`}
                    >
                      <Zap className={cn("h-3.5 w-3.5", level <= formData.energy && "fill-current")} />
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-[#818783]"><span>Laag</span><span>Heel goed</span></div>
              </div>
              <div>
                <label htmlFor="habit-note" className="text-sm font-semibold">Korte notitie</label>
                <textarea
                  id="habit-note"
                  value={formData.note}
                  onChange={(event) => update("note", event.target.value)}
                  placeholder="Wat hielp vandaag?"
                  maxLength={500}
                  className="mt-4 min-h-[86px] w-full resize-none border border-black/10 bg-white p-3 text-sm leading-6 outline-none focus:border-[#173622]"
                />
              </div>
            </section>

            <section className="grid border-y border-black/10 lg:grid-cols-[1fr_1.25fr]">
              <div className="py-7 lg:border-r lg:border-black/10 lg:pr-8">
                <h2 className="text-base font-semibold">Automatisch synchroniseren</h2>
                <p className="mt-2 max-w-md text-xs leading-5 text-[#707772]">
                  Laat stappen, slaap en beweging automatisch invullen via je telefoon of horloge.
                </p>
              </div>
              <div className="divide-y divide-black/10 lg:pl-8">
                <ConnectionRow icon={Apple} name="Apple Gezondheid" detail="iPhone en Apple Watch" onConnect={() => toast({ title: "Beschikbaar in de iPhone-app", description: "De HealthKit-toestemming wordt toegevoegd bij de mobiele appconfiguratie." })} />
                <ConnectionRow icon={HeartPulse} name="Health Connect" detail="Android en ondersteunde smartwatches" onConnect={() => toast({ title: "Beschikbaar in de Android-app", description: "De Health Connect-toestemming wordt toegevoegd bij de mobiele appconfiguratie." })} />
                <ConnectionRow icon={Watch} name="Polar" detail="Polar Flow via AccessLink" onConnect={() => toast({ title: "Polar-configuratie nodig", description: "Hiervoor zijn eerst Polar API-gegevens en een callback-URL nodig." })} />
              </div>
            </section>

            <div className="sticky bottom-4 z-10 mt-7 flex justify-end">
              <Button onClick={handleSave} disabled={isSaving} className="h-12 bg-[#173622] px-6 text-white shadow-[0_16px_36px_-22px_rgba(23,54,34,0.75)] hover:bg-[#21492e]">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Dag opslaan
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CounterRow({ icon: Icon, title, value, goal, unit, onDecrease, onIncrease, accent }: { icon: typeof Droplet; title: string; value: number; goal: string; unit: string; onDecrease: () => void; onIncrease: () => void; accent: string }) {
  return (
    <div className="grid min-h-[88px] grid-cols-[1fr_auto] items-center gap-5 py-4">
      <div className="flex items-center gap-4">
        <Icon className={cn("h-5 w-5", accent)} />
        <div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs text-[#747b76]">Doel: {goal}</p></div>
      </div>
      <div className="flex items-center border border-black/10">
        <button type="button" onClick={onDecrease} className="flex h-10 w-10 items-center justify-center border-r border-black/10 hover:bg-[#f7f8f5]" aria-label={`${title} verminderen`}><Minus className="h-3.5 w-3.5" /></button>
        <span className="min-w-[84px] px-3 text-center text-sm font-semibold">{value} <span className="text-[10px] font-normal text-[#7c837e]">{unit}</span></span>
        <button type="button" onClick={onIncrease} className="flex h-10 w-10 items-center justify-center border-l border-black/10 hover:bg-[#f7f8f5]" aria-label={`${title} verhogen`}><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

function NumberRow({ icon: Icon, title, value, goal, step, onChange, accent, suffix = "" }: { icon: typeof Footprints; title: string; value: number; goal: string; step: number; onChange: (value: number) => void; accent: string; suffix?: string }) {
  return (
    <div className="grid min-h-[88px] grid-cols-[1fr_auto] items-center gap-5 py-4">
      <div className="flex items-center gap-4">
        <Icon className={cn("h-5 w-5", accent)} />
        <div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs text-[#747b76]">Doel: {goal}</p></div>
      </div>
      <label className="flex h-10 min-w-[168px] items-center border border-black/10 bg-white px-3 focus-within:border-[#173622]">
        <input type="number" min="0" step={step} value={value || ""} onChange={(event) => onChange(Math.max(0, Number(event.target.value)))} placeholder="0" className="min-w-0 flex-1 border-0 bg-transparent text-right text-sm font-semibold outline-none" aria-label={title} />
        {suffix ? <span className="ml-2 text-[10px] text-[#7c837e]">{suffix}</span> : null}
      </label>
    </div>
  );
}

function ToggleRow({ icon: Icon, title, detail, checked, onChange }: { icon: typeof Sparkles; title: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="grid min-h-[88px] w-full grid-cols-[1fr_auto] items-center gap-5 py-4 text-left">
      <span className="flex items-center gap-4"><Icon className="h-5 w-5 text-[#735f48]" /><span><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs text-[#747b76]">{detail}</span></span></span>
      <span className={cn("flex h-8 w-8 items-center justify-center border", checked ? "border-[#173622] bg-[#173622] text-white" : "border-black/15 bg-white text-transparent")}><Check className="h-4 w-4" /></span>
    </button>
  );
}

function ConnectionRow({ icon: Icon, name, detail, onConnect }: { icon: typeof Apple; name: string; detail: string; onConnect: () => void }) {
  return (
    <div className="flex items-center gap-4 py-4">
      <Icon className="h-5 w-5 text-[#24382a]" />
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{name}</p><p className="mt-0.5 text-xs text-[#747b76]">{detail}</p></div>
      <button type="button" onClick={onConnect} className="inline-flex items-center gap-2 text-xs font-semibold text-[#173622] hover:underline">
        Instellen <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
