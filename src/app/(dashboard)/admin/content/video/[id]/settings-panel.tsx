"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEFAULT_COLOR_MATCH, VIDEO_MODE_LABELS } from "@/lib/video-studio-shared";
import type { ReviewProject } from "./video-review";

/** Briefing, "knippen op beeld" and the colour match, changeable after upload. */
export function SettingsPanel({ project, busy, onChanged }: { project: ReviewProject; busy: boolean; onChanged: () => Promise<void> }) {
  const mode = project.mode;
  const social = mode === "SOCIAL";
  const [open, setOpen] = useState(!project.versions.length && !project.briefing);
  const [briefing, setBriefing] = useState(project.briefing ?? "");
  const [cutByVisuals, setCutByVisuals] = useState(project.cutByVisuals);
  const [colorOn, setColorOn] = useState(project.colorMatch != null && project.colorMatch > 0);
  const [strength, setStrength] = useState(project.colorMatch && project.colorMatch > 0 ? project.colorMatch : DEFAULT_COLOR_MATCH);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const colorMatch = social && colorOn ? Math.round(strength * 100) / 100 : null;
  const hasVersion = project.versions.length > 0;
  const editChanged = briefing.trim() !== (project.briefing ?? "") || cutByVisuals !== project.cutByVisuals;
  const colorChanged = colorMatch !== (project.colorMatch && project.colorMatch > 0 ? project.colorMatch : null);

  async function save(redo?: "recut" | "color") {
    setSaving(redo ?? "save");
    setMessage(null);
    const res = await fetch(`/api/admin/video/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "settings", briefing: briefing.trim(), cutByVisuals, colorMatch, redo }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(null);
    if (!res.ok) {
      setMessage(data.error || "Opslaan mislukt");
      return;
    }
    setMessage(redo === "recut" ? "Je Mac knipt de video opnieuw." : redo === "color" ? "Je Mac maakt een versie met de nieuwe kleuren." : "Opgeslagen.");
    await onChanged();
  }

  const summary = [
    VIDEO_MODE_LABELS[project.mode],
    project.briefing ? "briefing" : null,
    social && project.cutByVisuals ? "knippen op beeld" : null,
    social && project.colorMatch ? `kleur ${Math.round(project.colorMatch * 100)}%` : null,
  ].filter(Boolean);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm">
        <SlidersHorizontal className="h-4 w-4 text-slate-500" />
        <span className="font-medium">Briefing &amp; instellingen</span>
        <span className="truncate text-muted-foreground">{summary.join(" · ")}</span>
        <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3">
          {mode === "FINISHED" ? null : (
          <textarea
            value={briefing}
            onChange={(e) => setBriefing(e.target.value)}
            rows={3}
            placeholder="Bijv. 6 shots van ±2 s, tekst per stap, eindigen op het bord. Of: begin met de zin over suiker."
            aria-label="Briefing voor de montage"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          )}
          {social ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={cutByVisuals} onChange={(e) => setCutByVisuals(e.target.checked)} />
                Knippen op beeld (bv. kookvideo zonder praten)
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={colorOn} onChange={(e) => setColorOn(e.target.checked)} />
                Kleuren zoals mijn Instagram
              </label>
              {colorOn ? (
                <label className="flex items-center gap-2 text-muted-foreground">
                  subtiel
                  <input
                    type="range"
                    min={0.2}
                    max={1}
                    step={0.1}
                    value={strength}
                    onChange={(e) => setStrength(Number(e.target.value))}
                    aria-label="Sterkte van de kleuraanpassing"
                  />
                  sterk
                </label>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {hasVersion && editChanged ? (
              <Button size="sm" disabled={busy || saving !== null} onClick={() => save("recut")}>
                {saving === "recut" ? "Bezig…" : "Opslaan & opnieuw knippen"}
              </Button>
            ) : null}
            {hasVersion && colorChanged && !editChanged ? (
              <Button size="sm" disabled={busy || saving !== null} onClick={() => save("color")}>
                {saving === "color" ? "Bezig…" : "Kleuren toepassen"}
              </Button>
            ) : null}
            <Button size="sm" variant="outline" disabled={saving !== null || (!editChanged && !colorChanged)} onClick={() => save()}>
              {saving === "save" ? "Opslaan…" : hasVersion ? "Alleen opslaan" : "Opslaan"}
            </Button>
            {message ? <span className="text-sm text-muted-foreground">{message}</span> : null}
          </div>
          {hasVersion && editChanged ? (
            <p className="text-xs text-muted-foreground">Opnieuw knippen maakt een nieuwe versie; je opmerkingen en handmatige knippen van nu gaan niet mee.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
