"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CAROUSEL_TEMPLATE_OPTIONS, CarouselTheme, DEFAULT_THEME } from "@/lib/carousel-shared";

type Settings = {
  briefing: string;
  topics: string;
  theme: CarouselTheme;
  postTime: string;
  autoPublish: boolean;
  enabled: boolean;
};

export async function uploadCarouselImage(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/carousels/upload", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Uploaden mislukt");
  return data.url as string;
}

export function CarouselSettingsDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || settings) return;
    fetch("/api/admin/carousels/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setSettings(data.settings))
      .catch(() => setMessage("Laden mislukt"));
  }, [open, settings]);

  const theme = settings?.theme ?? DEFAULT_THEME;
  const update = (patch: Partial<Settings>) => setSettings((s) => (s ? { ...s, ...patch } : s));
  const updateTheme = (patch: Partial<CarouselTheme>) => update({ theme: { ...theme, ...patch } });

  async function save() {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/carousels/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, theme: { ...theme, background: "photo" } }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error || "Opslaan mislukt");
      return;
    }
    onSaved();
    onOpenChange(false);
  }

  async function addProof(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setMessage(null);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) urls.push(await uploadCarouselImage(file));
      updateTheme({ proofImages: [...(theme.proofImages ?? []), ...urls] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Uploaden mislukt");
    }
    setUploading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Carousel Studio: instellingen</DialogTitle>
          <DialogDescription>Claude volgt je briefing en topics. Wijzigingen gelden voor de volgende carousels.</DialogDescription>
        </DialogHeader>
        {!settings ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Laden…
          </p>
        ) : (
          <div className="space-y-5 text-sm">
            <label className="block space-y-1.5">
              <span className="font-medium">Briefing &amp; tone of voice</span>
              <Textarea rows={10} value={settings.briefing} onChange={(e) => update({ briefing: e.target.value })} placeholder="Plak hier je goedgekeurde briefing." />
            </label>
            <label className="block space-y-1.5">
              <span className="font-medium">Topics (één per lijn, optioneel)</span>
              <Textarea rows={5} value={settings.topics} onChange={(e) => update({ topics: e.target.value })} placeholder={"Insulineresistentie en buikvet\nStress en spijsvertering\n…"} />
            </label>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <label className="flex items-center gap-2">
                Elke dag om
                <input type="time" value={settings.postTime} onChange={(e) => update({ postTime: e.target.value })} className="h-9 rounded-lg border border-slate-200 px-2" />
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.autoPublish} onChange={(e) => update({ autoPublish: e.target.checked })} />
                Automatisch inplannen (zonder nakijken)
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.enabled} onChange={(e) => update({ enabled: e.target.checked })} />
                Elke week nieuwe carousels maken
              </label>
            </div>
            <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <p className="font-medium">Ontwerp in de app (zonder Canva)</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block space-y-1.5">
                  <span>Standaard sjabloon</span>
                  <select value={theme.template ?? CAROUSEL_TEMPLATE_OPTIONS[0].id} onChange={(e) => updateTheme({ template: e.target.value })} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2">
                    {CAROUSEL_TEMPLATE_OPTIONS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span>Tekst linksboven</span>
                  <input value={theme.label ?? ""} onChange={(e) => updateTheme({ label: e.target.value })} maxLength={40} className="h-9 w-full rounded-lg border border-slate-200 px-2" placeholder="Simply in Balance" />
                </label>
                <label className="block space-y-1.5">
                  <span>Instagram-naam rechtsboven</span>
                  <input value={theme.handle ?? ""} onChange={(e) => updateTheme({ handle: e.target.value.replace(/^@/, "") })} maxLength={40} className="h-9 w-full rounded-lg border border-slate-200 px-2" placeholder="simplyinbalance" />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                {(
                  [
                    ["backgroundColor", "Achtergrond"],
                    ["textColor", "Tekst"],
                    ["accentColor", "Accent"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input type="color" value={theme[key]} onChange={(e) => updateTheme({ [key]: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-slate-200" />
                    {label}
                  </label>
                ))}
                <label className="flex items-center gap-2">
                  Donkere laag over foto
                  <input type="range" min={0} max={0.8} step={0.02} value={theme.shade} onChange={(e) => updateTheme({ shade: Number(e.target.value) })} />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">{CAROUSEL_TEMPLATE_OPTIONS.find((t) => t.id === (theme.template ?? CAROUSEL_TEMPLATE_OPTIONS[0].id))?.description}</p>
            </div>
            <p className="text-muted-foreground">
              Ontwerp in Canva: je Canva-sjabloon <strong>Carousel sjabloon – automatisch (niet verwijderen)</strong>. Pas je dat aan in Canva, dan volgen alle nieuwe
              carousels. Achtergrondfoto&apos;s: je eigen foto&apos;s in de map <strong>carousels/fotos</strong> op je Mac komen eerst, anders een passende
              (donkere) foto van Unsplash.
            </p>
            {message ? <p className="text-red-600">{message}</p> : null}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={save} disabled={!settings || saving}>
            {saving ? "Opslaan…" : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
