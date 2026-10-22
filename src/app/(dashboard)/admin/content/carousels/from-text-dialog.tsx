"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** "Carousel uit eigen tekst": Sixtine's own text or topic (+ briefing) → AI writes the 8 slides and caption. */
export function FromTextDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [briefing, setBriefing] = useState("");
  const [moment, setMoment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/carousels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "from-text",
        title: title.trim() || undefined,
        text,
        briefing: briefing.trim() || undefined,
        scheduledAt: moment ? new Date(moment).toISOString() : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Opslaan mislukt");
      return;
    }
    onOpenChange(false);
    setTitle("");
    setText("");
    setBriefing("");
    setMoment("");
    router.push(`/admin/content/carousels/${data.carousel.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Carousel uit eigen tekst</DialogTitle>
          <DialogDescription>
            Plak je tekst, notities of het onderwerp. AI maakt er 8 slides en een caption van in jouw tone of voice. Daarna kijk je de tekst na.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titel (optioneel), bv. Maagzuur en eiwitvertering"
            className="h-10 w-full rounded-lg border border-slate-200 px-3"
          />
          <label className="block space-y-1.5">
            <span className="font-medium">Jouw tekst of onderwerp</span>
            <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Plak hier je tekst, artikel, notities of beschrijf het onderwerp." />
          </label>
          <label className="block space-y-1.5">
            <span className="font-medium">Briefing voor deze carousel (optioneel)</span>
            <Textarea
              rows={3}
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              placeholder={'Bv. comment-woord "insuline", voor vrouwen in de perimenopauze, focus op de oorzaak, geen supplementen noemen.'}
            />
          </label>
          <label className="flex items-center gap-2">
            Inplannen op (optioneel)
            <input type="datetime-local" value={moment} onChange={(e) => setMoment(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2" />
          </label>
          {error ? <p className="text-red-600">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={save} disabled={saving || text.trim().length < 20}>
            {saving ? "Opslaan…" : "Carousel laten schrijven"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
