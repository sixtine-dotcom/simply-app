"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Settings = {
  briefing: string;
  idealClient: string;
  myStory: string;
  hooks: string;
  hooksUpdatedAt: string | null;
  hooksRequestedAt: string | null;
  perWeek: number;
  enabled: boolean;
};

const TABS = [
  { key: "myStory", label: "Mijn verhaal", hint: "Je eigen ervaringen, waarom je dit werk doet, wat je zelf meemaakte, klantverhalen (anoniem), je visie. AI gebruikt alleen wat hier staat." },
  { key: "idealClient", label: "Ideale klant", hint: "Wie is ze, waar loopt ze tegenaan, wat heeft ze al geprobeerd, welke woorden gebruikt ze zelf?" },
  { key: "hooks", label: "Hooks", hint: "Hook-formules die nu goed werken. Wordt elke maand automatisch aangevuld; je mag zelf hooks toevoegen of schrappen." },
  { key: "briefing", label: "Briefing", hint: "De structuur en stijlregels voor je scripts." },
] as const;

const dateFormatter = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long", year: "numeric" });

export function ScriptSettingsDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("myStory");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/admin/scripts/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setSettings(data.settings))
      .catch(() => setMessage("Laden mislukt"));
  }, [open]);

  const update = (p: Partial<Settings>) => setSettings((s) => (s ? { ...s, ...p } : s));

  async function save(extra: Record<string, unknown> = {}) {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    const { briefing, idealClient, myStory, hooks, perWeek, enabled } = settings;
    const res = await fetch("/api/admin/scripts/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ briefing, idealClient, myStory, hooks, perWeek, enabled, ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setMessage(data.error || "Opslaan mislukt");
    if (extra.refreshHooks) {
      update({ hooksRequestedAt: new Date().toISOString() });
      setMessage("Je Mac zoekt nieuwe virale hooks. Dat duurt een paar minuten.");
      return;
    }
    onSaved();
    onOpenChange(false);
  }

  const current = TABS.find((t) => t.key === tab)!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Instellingen Reel Scripts</DialogTitle>
          <DialogDescription>Hoe meer je hier over jezelf schrijft, hoe persoonlijker de scripts.</DialogDescription>
        </DialogHeader>
        {!settings ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn("rounded-full px-3 py-1 text-sm", tab === t.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600")}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{current.hint}</p>
            <Textarea rows={14} value={settings[tab]} onChange={(e) => update({ [tab]: e.target.value } as Partial<Settings>)} className="text-sm" />
            {tab === "hooks" ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Button size="sm" variant="outline" disabled={saving || Boolean(settings.hooksRequestedAt)} onClick={() => save({ refreshHooks: true })}>
                  <Search className="mr-1.5 h-4 w-4" /> {settings.hooksRequestedAt ? "Wordt gezocht…" : "Zoek nu nieuwe hooks"}
                </Button>
                {settings.hooksUpdatedAt ? <span>Laatst bijgewerkt op {dateFormatter.format(new Date(settings.hooksUpdatedAt))}</span> : <span>Nog niet automatisch bijgewerkt</span>}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.enabled} onChange={(e) => update({ enabled: e.target.checked })} />
                Elke maandag automatisch nieuwe scripts
              </label>
              <label className="flex items-center gap-2">
                Aantal per week
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={settings.perWeek}
                  onChange={(e) => update({ perWeek: Math.max(1, Math.min(14, Number(e.target.value) || 7)) })}
                  className="w-16 rounded-md border border-slate-200 px-2 py-1"
                />
              </label>
            </div>
          </div>
        )}
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        <DialogFooter>
          <Button disabled={saving || !settings} onClick={() => save()}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
