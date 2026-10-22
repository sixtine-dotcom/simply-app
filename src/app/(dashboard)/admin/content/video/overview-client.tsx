"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareQuote, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DEFAULT_COLOR_MATCH, VIDEO_MODE_LABELS, VideoMode } from "@/lib/video-studio-shared";

export function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);
  return null;
}

export function NewVideoForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<VideoMode>("SOCIAL");
  const [briefing, setBriefing] = useState("");
  const [cutByVisuals, setCutByVisuals] = useState(false);
  const [matchColors, setMatchColors] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        mode,
        briefing: mode === "FINISHED" ? undefined : briefing,
        cutByVisuals: mode === "SOCIAL" && cutByVisuals,
        colorMatch: mode === "SOCIAL" && matchColors ? DEFAULT_COLOR_MATCH : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Aanmaken mislukt");
      return;
    }
    setTitle("");
    setBriefing("");
    router.push(`/admin/content/video/${data.project.id}`);
  }

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-2 sm:flex-row sm:flex-wrap">
      <div className="flex shrink-0 rounded-full border border-slate-200 bg-white p-1" role="radiogroup" aria-label="Soort video">
        {(Object.keys(VIDEO_MODE_LABELS) as VideoMode[]).map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={mode === key}
            onClick={() => setMode(key)}
            className={cn("rounded-full px-4 py-1.5 text-sm", mode === key ? "bg-slate-900 text-white" : "text-slate-600")}
            title={
              key === "SOCIAL"
                ? "Knippen + ondertitels, grote woorden en zooms"
                : key === "COURSE"
                  ? "Alleen knippen (bv. Loom-opnames voor je cursus)"
                  : "Al bewerkt: niets aanpassen, alleen caption en inplannen"
            }
          >
            {VIDEO_MODE_LABELS[key]}
          </button>
        ))}
      </div>
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Titel, bijv. Ademhaling bij stress"
        aria-label="Titel van de nieuwe video"
      />
      <Button type="submit" disabled={saving || title.trim().length < 2} className="shrink-0">
        <Plus className="mr-1.5 h-4 w-4" />
        {saving ? "Aanmaken…" : "Nieuwe video"}
      </Button>
      {mode !== "FINISHED" ? (
        <div className="flex flex-col gap-2 sm:basis-full">
          <textarea
            value={briefing}
            onChange={(event) => setBriefing(event.target.value)}
            rows={2}
            placeholder="Briefing (optioneel), bijv. 6 shots van ±2 s, tekst per stap, eindigen op het bord"
            aria-label="Briefing voor de montage"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          {mode === "SOCIAL" ? (
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={cutByVisuals} onChange={(e) => setCutByVisuals(e.target.checked)} />
                Knippen op beeld (bv. kookvideo zonder praten)
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={matchColors} onChange={(e) => setMatchColors(e.target.checked)} />
                Kleuren zoals mijn Instagram
              </label>
            </div>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-600 sm:basis-full">{error}</p> : null}
    </form>
  );
}

/** Tone of voice for AI captions: paste example captions once; every new caption follows that style. */
export function ToneOfVoiceButton() {
  const [open, setOpen] = useState(false);
  const [examples, setExamples] = useState("");
  const [guidelines, setGuidelines] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || loaded) return;
    fetch("/api/admin/video/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setExamples(data.settings?.captionExamples ?? "");
        setGuidelines(data.settings?.captionGuidelines ?? "");
        setLoaded(true);
      })
      .catch(() => setMessage("Laden mislukt"));
  }, [open, loaded]);

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/video/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ captionExamples: examples || null, captionGuidelines: guidelines || null }),
    });
    setSaving(false);
    if (res.ok) setOpen(false);
    else setMessage("Opslaan mislukt");
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <MessageSquareQuote className="mr-1.5 h-4 w-4" /> Tone of voice captions
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tone of voice voor Instagram-captions</DialogTitle>
            <DialogDescription>
              Plak hier 5 tot 15 captions die je goed vindt, gescheiden door een lege regel of ---. Claude schrijft nieuwe
              captions in dezelfde stijl.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Voorbeeldcaptions</span>
              <Textarea rows={12} value={examples} onChange={(event) => setExamples(event.target.value)} placeholder={loaded ? "Plak hier je captions…" : "Laden…"} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Extra richtlijnen (optioneel)</span>
              <Textarea
                rows={3}
                value={guidelines}
                onChange={(event) => setGuidelines(event.target.value)}
                placeholder="Bijv. altijd eindigen met ‘Comment CALL voor een gratis kennismaking’, max. 3 emoji's, vaste hashtags: #simplyinbalance"
              />
            </label>
            {message ? <p className="text-sm text-red-600">{message}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button disabled={saving || !loaded} onClick={() => void save()}>
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
