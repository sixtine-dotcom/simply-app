"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CarouselBrandPhoto } from "@/lib/carousel-shared";

export async function uploadBrandPhoto(file: File): Promise<CarouselBrandPhoto> {
  const form = new FormData(); form.append("file", file);
  const res = await fetch("/api/admin/carousels/photos", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(`${file.name}: ${data.error || "Uploaden mislukt"}`);
  return data.photo;
}

export function BrandPhotosPanel({ photos, selected, disabled, dirty, onSelect, onBusy, onPhotos }: {
  photos: CarouselBrandPhoto[];
  selected: string | null;
  disabled: boolean;
  dirty: boolean;
  onSelect: (url: string) => Promise<boolean>;
  onBusy: (busy: boolean) => void;
  onPhotos: (photos: CarouselBrandPhoto[]) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const onPhotosRef = useRef(onPhotos);
  onPhotosRef.current = onPhotos;
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/carousels/photos", { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Foto’s laden mislukt");
        if (!controller.signal.aborted) onPhotosRef.current(data.photos);
      })
      .catch((err) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Foto’s laden mislukt"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function selectPhoto(url: string) {
    setError(null);
    try {
      await onSelect(url);
    } catch {
      setError("De foto kon niet worden gekozen. Controleer je verbinding en probeer opnieuw.");
      onBusy(false);
    }
  }

  async function upload(files: FileList | null) {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    setUploading(true); onBusy(true); setError(null);
    let nextPhotos = photos;
    let first: string | null = null;
    try {
      for (let i = 0; i < list.length; i++) {
        setProgress(`Foto ${i + 1} van ${list.length} uploaden…`);
        const photo = await uploadBrandPhoto(list[i]);
        nextPhotos = [photo, ...nextPhotos];
        first ??= photo.url;
        onPhotosRef.current(nextPhotos);
      }
      if (!selected && first) await onSelect(first);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uploaden mislukt. Al opgeslagen foto’s blijven in je collectie.");
    } finally {
      setUploading(false); onBusy(false); setProgress("");
      if (input.current) input.current.value = "";
    }
  }

  return (
    <section aria-labelledby="brand-photos-title" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="brand-photos-title" className="font-semibold text-slate-950">Jouw foto’s</h2>
        <Button variant="outline" disabled={disabled || uploading || dirty} onClick={() => input.current?.click()}>
          {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />} Foto’s uploaden
        </Button>
        <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Foto’s toevoegen aan je collectie" onChange={(e) => void upload(e.target.files)} />
      </div>
      <p className="max-w-3xl text-sm text-muted-foreground">Dit is je centrale fotobibliotheek voor alle carousels. Je kunt hier altijd foto’s toevoegen; opnieuw uploaden per carousel is niet nodig. Kies hieronder een foto voor deze carousel of kies per slide een andere.</p>
      {progress ? <p role="status" className="text-sm text-muted-foreground">{progress}</p> : null}
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {loading ? <p role="status" className="text-sm text-muted-foreground">Foto’s laden…</p> : photos.length || selected ? (
        <div className="flex gap-3 overflow-x-auto py-1">
          {selected && !photos.some((photo) => photo.url === selected || photo.cutoutUrl === selected) ? <div className="w-24 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected} alt="Huidige foto voor deze carousel" className="aspect-[4/5] w-24 rounded-lg object-cover" />
            <p className="mt-1 text-xs text-muted-foreground">Huidige foto</p>
          </div> : null}
          {photos.map((photo) => (
            <button key={photo.id} type="button" aria-pressed={selected === photo.url || Boolean(photo.cutoutUrl && selected === photo.cutoutUrl)} aria-label={`Gebruik ${photo.name} voor deze carousel${photo.cutoutUrl ? " (vrijstaand)" : ""}`} disabled={disabled || dirty || uploading} onClick={() => void selectPhoto(photo.cutoutUrl || photo.url)} className={`relative w-24 shrink-0 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait ${selected === photo.url || Boolean(photo.cutoutUrl && selected === photo.cutoutUrl) ? "ring-2 ring-primary ring-offset-2" : "hover:opacity-80"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.name} className="aspect-[4/5] w-24 rounded-lg object-cover" />
              {selected === photo.url || Boolean(photo.cutoutUrl && selected === photo.cutoutUrl) ? <span className="absolute right-1 top-1 rounded-full bg-primary p-1 text-primary-foreground"><Check className="h-3 w-3" /></span> : null}
              <span className="mt-1 block truncate text-xs text-muted-foreground">{photo.name}</span>
              {photo.cutoutUrl ? <span className="block text-xs text-primary">Vrijstaand beschikbaar</span> : null}
            </button>
          ))}
        </div>
      ) : <p className="text-sm text-muted-foreground">Nog geen foto’s. Voeg portretten of foto’s uit je eigen werk en dagelijks leven toe (JPG, PNG of WebP, maximaal 15 MB per foto).</p>}
      {dirty ? <p className="text-xs text-muted-foreground">Wacht tot je wijzigingen zijn opgeslagen om een foto te kiezen.</p> : null}
    </section>
  );
}
