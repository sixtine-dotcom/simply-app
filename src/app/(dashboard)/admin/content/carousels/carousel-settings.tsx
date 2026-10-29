"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CarouselTheme, DEFAULT_THEME, DEFAULT_CANVA_TEMPLATE_ID } from "@/lib/carousel-shared";

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
            <label className="block space-y-1.5">
              <span className="font-medium">Canva-sjabloon</span>
              <input
                type="text"
                value={theme.canvaTemplateId ?? DEFAULT_CANVA_TEMPLATE_ID}
                onChange={(e) => updateTheme({ canvaTemplateId: e.target.value.trim() })}
                aria-describedby="canva-template-help"
                className="h-10 w-full rounded-lg border border-slate-200 px-3"
                placeholder="DAHXZ5e-kPk"
              />
              <span id="canva-template-help" className="block text-muted-foreground">
                Vul het ontwerp-ID uit je Canva-link in. Dit geldt voor volgende opdrachten via ‘Maak in Canva’.
                Bestaande ontwerpen blijven behouden.
              </span>
            </label>
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
