"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Trash2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { uploadCarouselImage } from "./carousel-settings";

/** Next free morning at 07:00 as the default moment. */
function defaultMoment() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(7, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T07:00`;
}

/** An existing (already designed) carousel: upload the slides, pick or write a caption, choose a moment. */
export function UploadCarouselDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"canva" | "files">("canva");
  const [canvaUrl, setCanvaUrl] = useState("");
  const [title, setTitle] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [writeCaption, setWriteCaption] = useState(true);
  const [moment, setMoment] = useState(defaultMoment());
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    // Keep the order of the file names (slide-1, slide-2…), like a Canva export.
    const sorted = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    setUploading(sorted.length);
    for (const file of sorted) {
      try {
        const url = await uploadCarouselImage(file);
        setImages((all) => [...all, url].slice(0, 10));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Uploaden mislukt");
      }
      setUploading((n) => n - 1);
    }
  }

  const move = (i: number, by: number) =>
    setImages((all) => {
      const next = [...all];
      const [item] = next.splice(i, 1);
      next.splice(Math.max(0, Math.min(next.length, i + by)), 0, item);
      return next;
    });

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/carousels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: mode === "canva" ? "canva-link" : "upload",
        title,
        ...(mode === "canva" ? { canvaUrl: canvaUrl.trim() } : { imageUrls: images }),
        caption: writeCaption ? undefined : caption,
        writeCaption,
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
    setImages([]);
    setCanvaUrl("");
    setCaption("");
    router.push(`/admin/content/carousels/${data.carousel.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bestaande carousel inplannen</DialogTitle>
          <DialogDescription>Plak de link van je Canva-ontwerp, of upload de slides zelf. Maximaal 10 slides.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={mode === "canva" ? "Titel (optioneel), bv. Stress en je spijsvertering" : "Titel, bv. Stress en je spijsvertering"}
            className="h-10 w-full rounded-lg border border-slate-200 px-3"
          />
          <div className="flex rounded-full border border-slate-200 bg-white p-1" role="radiogroup" aria-label="Hoe">
            {(
              [
                ["canva", "Canva-link"],
                ["files", "Afbeeldingen uploaden"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={mode === key}
                onClick={() => setMode(key)}
                className={mode === key ? "flex-1 rounded-full bg-slate-900 px-3 py-1.5 text-white" : "flex-1 rounded-full px-3 py-1.5 text-slate-600"}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === "canva" ? (
            <div className="space-y-1">
              <input
                value={canvaUrl}
                onChange={(e) => setCanvaUrl(e.target.value)}
                placeholder="https://www.canva.com/design/DA…/…"
                className="h-10 w-full rounded-lg border border-slate-200 px-3"
              />
              <p className="text-xs text-muted-foreground">
                In Canva: Delen → Link kopiëren. De slides worden binnen een kwartier opgehaald (tussen 7 en 23 u, als de Claude-app openstaat).
              </p>
            </div>
          ) : (
          <div className="flex flex-wrap gap-2">
            {images.map((url, i) => (
              <div key={url} className="relative w-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Slide ${i + 1}`} className="aspect-[4/5] w-28 rounded-lg border object-cover" />
                <span className="absolute left-1 top-1 rounded-full bg-white/90 px-1.5 text-xs">{i + 1}</span>
                <div className="mt-1 flex justify-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} aria-label="Naar links" className="rounded p-1 hover:bg-slate-100">
                    <ArrowUp className="h-3.5 w-3.5 -rotate-90" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} aria-label="Naar rechts" className="rounded p-1 hover:bg-slate-100">
                    <ArrowDown className="h-3.5 w-3.5 -rotate-90" />
                  </button>
                  <button type="button" onClick={() => setImages((all) => all.filter((u) => u !== url))} aria-label="Verwijderen" className="rounded p-1 hover:bg-slate-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {images.length < 10 ? (
              <label className="flex aspect-[4/5] w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? `Nog ${uploading}…` : "Slides toevoegen"}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => void addFiles(e.target.files)} />
              </label>
            ) : null}
          </div>
          )}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={writeCaption} onChange={(e) => setWriteCaption(e.target.checked)} />
              Laat AI de caption schrijven (in jouw tone of voice, op basis van de slides)
            </label>
            {!writeCaption ? <Textarea rows={8} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption" /> : null}
          </div>
          <label className="flex items-center gap-2">
            Inplannen op
            <input type="datetime-local" value={moment} onChange={(e) => setMoment(e.target.value)} className="h-9 rounded-lg border border-slate-200 px-2" />
          </label>
          {error ? <p className="text-red-600">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={save} disabled={
              saving ||
              uploading > 0 ||
              (mode === "files" ? images.length < 2 || !title.trim() : !canvaUrl.trim()) ||
              (!writeCaption && !caption.trim())
            }>
            {saving ? "Opslaan…" : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
