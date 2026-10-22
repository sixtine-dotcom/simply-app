"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Copy, Lightbulb, Loader2, RotateCcw, Settings2, Sparkles, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ScriptSettingsDialog } from "./script-settings";

export type ScriptItem = {
  id: string;
  headline: string;
  topic: string | null;
  hook: string;
  credibility: string;
  value: string;
  cta: string;
  hookFormat: string | null;
  storyNote: string | null;
  status: string;
  recordedAt: string | null;
  feedback: string | null;
  weekStart: string | null;
  errorMessage: string | null;
  createdAt: string;
};

const STATUS: Record<string, { label: string; className: string }> = {
  WRITING: { label: "AI schrijft…", className: "bg-amber-50 text-amber-700" },
  DRAFT: { label: "Na te kijken", className: "bg-slate-100 text-slate-700" },
  READY: { label: "Klaar om op te nemen", className: "bg-sky-50 text-sky-700" },
  RECORDED: { label: "Opgenomen", className: "bg-emerald-50 text-emerald-700" },
};

const weekFormatter = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long", timeZone: "Europe/Brussels" });

function mondayOf(iso: string) {
  const local = new Date(new Date(iso).toLocaleString("en-US", { timeZone: "Europe/Brussels" }));
  local.setDate(local.getDate() - ((local.getDay() + 6) % 7));
  local.setHours(12, 0, 0, 0);
  return local;
}

function groupByWeek(items: ScriptItem[]) {
  const thisMonday = mondayOf(new Date().toISOString()).getTime();
  const groups = new Map<string, { key: string; label: string; start: number; items: ScriptItem[] }>();
  for (const item of items) {
    const monday = mondayOf(item.weekStart ?? item.createdAt);
    const key = monday.toISOString().slice(0, 10);
    const label = monday.getTime() === thisMonday ? `Deze week · week van ${weekFormatter.format(monday)}` : `Week van ${weekFormatter.format(monday)}`;
    const g = groups.get(key) ?? { key, label, start: monday.getTime(), items: [] };
    g.items.push(item);
    groups.set(key, g);
  }
  return Array.from(groups.values()).sort((a, b) => b.start - a.start);
}

function AutoTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  };
  useLayoutEffect(fit, [props.value]);
  return <Textarea ref={ref} rows={1} {...props} style={{ ...props.style, overflow: "hidden" }} />;
}

async function patch(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/admin/scripts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
  return data.script as ScriptItem;
}

function scriptAsText(s: ScriptItem) {
  return [`TEKST BOVEN JE HOOFD: ${s.headline}`, "", `HOOK: ${s.hook}`, "", `GELOOFWAARDIGHEID: ${s.credibility}`, "", `WAARDE:\n${s.value}`, "", `CTA: ${s.cta}`].join("\n");
}

const FIELDS: Array<{ key: "headline" | "hook" | "credibility" | "value" | "cta"; label: string; hint: string }> = [
  { key: "headline", label: "Tekst boven je hoofd", hint: "Korte headline die in beeld staat" },
  { key: "hook", label: "1 · Hook", hint: "Wat je als eerste zegt" },
  { key: "credibility", label: "2 · Geloofwaardigheid", hint: "Waarom jij dit weet" },
  { key: "value", label: "3 · Waarde", hint: "Je verhaal en de uitleg" },
  { key: "cta", label: "4 · Call-to-action", hint: "Wat ze nu moeten doen" },
];

function ScriptCard({ initial, onDeleted }: { initial: ScriptItem; onDeleted: () => void }) {
  const [script, setScript] = useState(initial);
  const [open, setOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const dirty = useRef<Partial<ScriptItem>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep following the server while the AI is (re)writing this script.
  useEffect(() => {
    if (script.status !== "WRITING") return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/admin/scripts/${script.id}`, { cache: "no-store" }).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (data?.script && data.script.status !== "WRITING") setScript(data.script);
    }, 5000);
    return () => clearInterval(t);
  }, [script.status, script.id]);

  async function flush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const changes = dirty.current;
    if (!Object.keys(changes).length) return;
    dirty.current = {};
    setSaveState("saving");
    try {
      await patch(script.id, { action: "save", ...changes });
      setSaveState("saved");
    } catch (error) {
      dirty.current = { ...changes, ...dirty.current };
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "Opslaan mislukt");
    }
  }

  function edit(key: keyof ScriptItem, value: string) {
    setScript((s) => ({ ...s, [key]: value }));
    dirty.current = { ...dirty.current, [key]: value };
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  }

  useEffect(() => () => void flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      await flush();
      setScript(await patch(script.id, body));
      if (body.action === "rewrite") setFeedback("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Mislukt");
    }
    setBusy(false);
  }

  async function remove() {
    if (!confirm("Dit script verwijderen?")) return;
    await fetch(`/api/admin/scripts/${script.id}`, { method: "DELETE" });
    onDeleted();
  }

  const status = STATUS[script.status] ?? STATUS.DRAFT;
  const writing = script.status === "WRITING";

  return (
    <li className="rounded-2xl border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <ChevronRight className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-90")} />
        <span className={cn("min-w-0 flex-1 truncate font-medium", script.status === "RECORDED" ? "text-slate-400 line-through" : "text-slate-900")}>
          {script.headline}
        </span>
        {script.errorMessage ? <span className="text-xs text-red-600">Herschrijven mislukt</span> : null}
        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", status.className)}>
          {writing ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : null}
          {status.label}
        </span>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3">
          {script.hookFormat || script.storyNote ? (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {script.hookFormat ? <>Hook-formule: <strong>{script.hookFormat}</strong>. </> : null}
              {script.storyNote ? <>Verhaal: {script.storyNote}</> : null}
            </p>
          ) : null}

          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{f.label}</span>
              <AutoTextarea
                disabled={writing}
                value={script[f.key] ?? ""}
                onChange={(e) => edit(f.key, e.target.value)}
                onBlur={() => void flush()}
                placeholder={f.hint}
                className={cn("mt-1 min-h-0 resize-none text-sm leading-relaxed", f.key === "headline" && "font-semibold")}
              />
            </label>
          ))}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {script.status === "DRAFT" ? (
              <Button size="sm" disabled={busy || writing} onClick={() => run({ action: "status", status: "READY" })}>
                <Check className="mr-1.5 h-4 w-4" /> Goedkeuren
              </Button>
            ) : null}
            {script.status === "READY" ? (
              <Button size="sm" disabled={busy} onClick={() => run({ action: "status", status: "RECORDED" })}>
                <Video className="mr-1.5 h-4 w-4" /> Opgenomen
              </Button>
            ) : null}
            {script.status === "READY" || script.status === "RECORDED" ? (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => run({ action: "status", status: script.status === "RECORDED" ? "READY" : "DRAFT" })}>
                <RotateCcw className="mr-1.5 h-4 w-4" /> Terugzetten
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(scriptAsText(script));
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              <Copy className="mr-1.5 h-4 w-4" /> {copied ? "Gekopieerd" : "Kopieer"}
            </Button>
            <Button size="sm" variant="ghost" className="text-red-600" onClick={remove}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Verwijder
            </Button>
            <span className="ml-auto text-xs text-slate-400">
              {saveState === "saving" ? "Opslaan…" : saveState === "saved" ? "Opgeslagen" : saveState === "error" ? "Niet opgeslagen" : ""}
            </span>
          </div>

          <div className="rounded-xl border border-dashed border-slate-200 p-3">
            <AutoTextarea
              disabled={writing}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Wat moet er anders? Bv. 'meer mijn eigen verhaal over mijn burn-out', 'hook scherper', 'korter'…"
              className="min-h-0 resize-none border-transparent px-1 text-sm shadow-none"
            />
            <Button size="sm" variant="outline" className="mt-2" disabled={busy || writing || feedback.trim().length < 3} onClick={() => run({ action: "rewrite", feedback })}>
              <Sparkles className="mr-1.5 h-4 w-4" /> Herschrijf
            </Button>
          </div>
          {script.errorMessage ? <p className="text-xs text-red-600">{script.errorMessage}</p> : null}
          {message ? <p className="text-xs text-red-600">{message}</p> : null}
        </div>
      ) : null}
    </li>
  );
}

function IdeaDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/scripts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "from-idea", idea }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Mislukt");
    setIdea("");
    onOpenChange(false);
    onDone();
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Script uit je eigen idee</DialogTitle>
          <DialogDescription>Schrijf of plak je idee, een ervaring met een klant of iets uit je eigen leven. AI maakt er een script van in jouw structuur.</DialogDescription>
        </DialogHeader>
        <Textarea rows={8} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Bv. Vandaag zei een klant dat ze na 3 weken eindelijk zonder pijn ongesteld was…" />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <DialogFooter>
          <Button disabled={busy || idea.trim().length < 10} onClick={submit}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />} Schrijf script
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ScriptsOverview({ items, generating, hasStory }: { items: ScriptItem[]; generating: boolean; hasStory: boolean }) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [filter, setFilter] = useState<"open" | "all">("open");

  // While a week is being written, refresh until it lands.
  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(t);
  }, [generating, router]);

  async function generate(cancel = false) {
    setRequesting(true);
    await fetch("/api/admin/scripts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cancel ? { action: "cancel" } : {}) });
    setRequesting(false);
    router.refresh();
  }

  const visible = filter === "open" ? items.filter((s) => s.status !== "RECORDED") : items;
  const groups = groupByWeek(visible);
  const recorded = items.filter((s) => s.status === "RECORDED").length;

  return (
    <div className="space-y-4">
      {!hasStory ? (
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800"
        >
          <Lightbulb className="mr-1.5 inline h-4 w-4" />
          Vul <strong>Mijn verhaal</strong> in bij Instellingen: je eigen ervaringen, waarom je dit doet, klantverhalen. Zonder dat kan AI geen echte
          verhalen in je scripts verwerken (het verzint nooit iets over jou).
        </button>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {generating ? (
          <>
            <Button disabled>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Week wordt geschreven…
            </Button>
            <Button variant="ghost" disabled={requesting} onClick={() => generate(true)}>
              Annuleer
            </Button>
          </>
        ) : (
          <Button disabled={requesting} onClick={() => generate()}>
            <Sparkles className="mr-1.5 h-4 w-4" /> Maak een week
          </Button>
        )}
        <Button variant="outline" onClick={() => setIdeaOpen(true)}>
          <Lightbulb className="mr-1.5 h-4 w-4" /> Uit eigen idee
        </Button>
        <Button variant="outline" onClick={() => setSettingsOpen(true)}>
          <Settings2 className="mr-1.5 h-4 w-4" /> Instellingen
        </Button>
        <div className="ml-auto flex rounded-full border border-slate-200 bg-white p-0.5 text-sm">
          {(["open", "all"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={cn("rounded-full px-3 py-1", filter === f ? "bg-slate-900 text-white" : "text-slate-600")}>
              {f === "open" ? "Nog op te nemen" : `Alles (${recorded} opgenomen)`}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm text-muted-foreground">
          Nog geen scripts. Klik op <strong>Maak een week</strong>.
        </p>
      ) : (
        groups.map((g, i) => (
          <details key={g.key} open={i === 0} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 py-1 text-sm font-semibold text-slate-700">
              <ChevronRight className="h-4 w-4 transition group-open:rotate-90" />
              {g.label}
              <span className="font-normal text-slate-400">· {g.items.length} scripts</span>
            </summary>
            <ul className="mt-2 space-y-2">
              {g.items.map((s) => (
                <ScriptCard key={s.id} initial={s} onDeleted={() => router.refresh()} />
              ))}
            </ul>
          </details>
        ))
      )}

      <ScriptSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} onSaved={() => router.refresh()} />
      <IdeaDialog open={ideaOpen} onOpenChange={setIdeaOpen} onDone={() => router.refresh()} />
    </div>
  );
}
