"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ImageIcon, Loader2, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CAROUSEL_STATUS_LABELS, CarouselSlide, PUBLISH_STATUS_LABELS, SLIDE_TYPE_LABELS, boldWords } from "@/lib/carousel-shared";
import { uploadCarouselImage } from "../carousel-settings";

export type EditorCarousel = {
  id: string;
  title: string;
  topic: string | null;
  slides: CarouselSlide[];
  caption: string | null;
  photoUrl: string | null;
  photoQuery: string | null;
  source: string;
  captionRequestedAt: string | null;
  canvaDesignId: string | null;
  updatedAt: string;
  imageUrls: string[] | null;
  renderedAt: string | null;
  renderRequestedAt: string | null;
  status: string;
  errorMessage: string | null;
  scheduledAt: string | null;
  publishStatus: string | null;
  publishError: string | null;
  publishedAt: string | null;
};

const formatter = new Intl.DateTimeFormat("nl-BE", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });

/** Textarea that always grows to fit its text, so nothing has to be scrolled. */
function AutoTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  };
  useLayoutEffect(fit, [props.value]);
  useEffect(() => {
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return <Textarea ref={ref} rows={1} {...props} style={{ ...props.style, overflow: "hidden" }} />;
}

/** "2026-10-09T07:00" in local time for the date input. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CarouselEditor({ initial }: { initial: EditorCarousel }) {
  const router = useRouter();
  const [carousel, setCarousel] = useState(initial);
  const [slides, setSlides] = useState<CarouselSlide[]>(initial.slides);
  const [caption, setCaption] = useState(initial.caption ?? "");
  const [title, setTitle] = useState(initial.title);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoQuery, setPhotoQuery] = useState("");
  const [captionFeedback, setCaptionFeedback] = useState("");
  const [moment, setMoment] = useState(toLocalInput(initial.scheduledAt));
  // Existing carousels (uploaded images or a Canva link): no text editing, the slides are as designed.
  const uploaded = carousel.source !== "AI";
  const fromCanvaLink = carousel.source === "CANVA_LINK";
  // Only a pasted Canva link is fetched automatically; AI carousels go to Canva on request.
  const rendering = fromCanvaLink && (carousel.status === "DRAFT" || Boolean(carousel.renderRequestedAt));
  const textStage = !uploaded && ["WRITING", "DRAFT", "TEXT_APPROVED", "CANVA_REQUESTED", "IN_CANVA", "CANVA_EXPORT"].includes(carousel.status);
  const makingCanva = carousel.status === "CANVA_REQUESTED" || carousel.status === "CANVA_EXPORT";
  const canvaUrl = carousel.canvaDesignId?.startsWith("D") ? `https://www.canva.com/design/${carousel.canvaDesignId}/edit` : null;
  const writingCaption = Boolean(carousel.captionRequestedAt);
  const locked = carousel.publishStatus === "PUBLISHING" || carousel.publishStatus === "PUBLISHED";

  const reload = useCallback(async () => {
    const res = await fetch(`/api/admin/carousels/${carousel.id}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setCarousel(data.carousel);
  }, [carousel.id]);

  // Take over freshly written slides/caption (AI, Mac) unless the user is editing.
  useEffect(() => {
    if (!dirty) setSlides(carousel.slides ?? []);
    if (!dirty) setTitle(carousel.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carousel.slides, carousel.title]);

  useEffect(() => {
    if (!dirty) setCaption(carousel.caption ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carousel.caption]);

  useEffect(() => {
    if (!carousel.errorMessage && !rendering && !writingCaption && !makingCanva && carousel.status !== "WRITING" && carousel.publishStatus !== "PUBLISHING") return;
    const timer = setInterval(reload, 4000);
    return () => clearInterval(timer);
  }, [rendering, writingCaption, makingCanva, carousel.status, carousel.publishStatus, carousel.errorMessage, reload]);

  async function act(action: string, extra: object = {}) {
    setBusy(action);
    setError(null);
    const res = await fetch(`/api/admin/carousels/${carousel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(data.error || "Er ging iets mis");
      return false;
    }
    setCarousel(data.carousel);
    return true;
  }

  // Never lose typing: a copy in this browser right away, and saved to the app 2 s after the last keystroke.
  const backupKey = `carousel-concept-${carousel.id}`;
  const [restored, setRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(backupKey);
      if (!raw) return;
      const backup = JSON.parse(raw) as { at: number; title: string; slides: CarouselSlide[]; caption: string };
      if (backup.at > new Date(initial.updatedAt).getTime()) {
        setTitle(backup.title);
        setSlides(backup.slides);
        setCaption(backup.caption);
        setDirty(true);
        setRestored(true);
      } else localStorage.removeItem(backupKey);
    } catch {
      // no browser storage: nothing to restore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!dirty || locked) return;
    try {
      localStorage.setItem(backupKey, JSON.stringify({ at: Date.now(), title, slides, caption }));
    } catch {
      // ignore
    }
    const timer = setTimeout(() => void save(), 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, title, slides, caption]);

  // What is on screen right now (to know whether she kept typing while saving).
  const latest = useRef({ title, slides, caption });
  latest.current = { title, slides, caption };

  /** Slides downloaded from Canva (or anywhere): straight into the carousel, in file-name order. */
  async function dropSlides(files: FileList | File[] | null) {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (list.length < 2) {
      setError("Kies minstens 2 slides (afbeeldingen)");
      return;
    }
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    setBusy("upload");
    setError(null);
    try {
      const urls: string[] = [];
      for (const file of list.slice(0, 10)) urls.push(await uploadCarouselImage(file));
      if (dirty) await save();
      await act("set-images", { imageUrls: urls });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Uploaden mislukt");
      setBusy(null);
    }
  }

  /** Save the text first (when changed), then do the action, so nothing typed is ever lost. */
  async function saveThen(action: string) {
    if (dirty && !(await save())) return;
    await act(action);
  }

  async function save() {
    const snapshot = JSON.stringify({ title, slides, caption });
    const ok = Boolean(await act("save", { title, caption, ...(uploaded ? {} : { slides }) }));
    if (ok) {
      setSavedAt(new Date());
      // Typed on during the save: stay "dirty", the next autosave takes the newer text.
      if (JSON.stringify(latest.current) !== snapshot) return ok;
      setDirty(false);
      setRestored(false);
      try {
        localStorage.removeItem(backupKey);
      } catch {
        // ignore
      }
    }
    return ok;
  }

  async function ownPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy("photo");
    try {
      const url = await uploadCarouselImage(file);
      await act("set-photo", { photoUrl: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Uploaden mislukt");
      setBusy(null);
    }
  }

  /** Extra explanation slide, just before the call-to-action (max 10 slides). */
  const addSlide = () => {
    setSlides((all) => {
      if (all.length >= 10) return all;
      const ctaIndex = all.findIndex((s) => s.type === "cta");
      const at = ctaIndex === -1 ? all.length : ctaIndex;
      return [...all.slice(0, at), { type: "body", text: "" }, ...all.slice(at)];
    });
    setDirty(true);
  };
  const removeSlide = (index: number) => {
    setSlides((all) => (all.length <= 2 ? all : all.filter((_, i) => i !== index)));
    setDirty(true);
  };

  const editSlide = (index: number, patch: Partial<CarouselSlide>) => {
    setSlides((all) => all.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    setDirty(true);
  };

  const statusLabel =
    carousel.status === "APPROVED" && carousel.publishStatus ? PUBLISH_STATUS_LABELS[carousel.publishStatus] : CAROUSEL_STATUS_LABELS[carousel.status];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <Link href="/admin/content/carousels" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Carousels
          </Link>
          <input
            value={title}
            disabled={locked}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            aria-label="Titel"
            className="mt-2 w-full bg-transparent text-3xl font-semibold tracking-tight text-slate-950 outline-none"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            {statusLabel}
            {carousel.scheduledAt ? ` · ${formatter.format(new Date(carousel.scheduledAt))}` : ""}
            {carousel.topic ? ` · ${carousel.topic}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {textStage ? (
            carousel.status === "WRITING" ? null : carousel.status === "DRAFT" ? (
              <Button disabled={busy !== null} onClick={() => void saveThen("approve-text")}>
                <Check className="mr-1.5 h-4 w-4" /> Tekst goedkeuren
              </Button>
            ) : makingCanva ? (
              <>
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> {carousel.status === "CANVA_EXPORT" ? "Slides worden opgehaald uit Canva…" : "Wordt gemaakt in Canva…"}
                </span>
                <Button variant="outline" disabled={busy !== null} onClick={() => void act("unapprove-text")}>
                  Toch nog aanpassen
                </Button>
              </>
            ) : (
              <>
                {carousel.status === "TEXT_APPROVED" ? (
                  <Button disabled={busy !== null} onClick={() => void saveThen("make-canva")}>
                    Maak in Canva
                  </Button>
                ) : null}
                {canvaUrl && carousel.status === "IN_CANVA" ? (
                  <>
                    <a href={canvaUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-sm">
                      Open in Canva
                    </a>
                    <Button disabled={busy !== null} onClick={() => void saveThen("fetch-canva")} title="Klaar in Canva? Haal de slides op om in te plannen">
                      Slides ophalen uit Canva
                    </Button>
                  </>
                ) : null}
                <Button variant="outline" disabled={busy !== null} onClick={() => void act("unapprove-text")}>
                  Tekst opnieuw aanpassen
                </Button>
              </>
            )
          ) : !locked ? (
            carousel.status === "APPROVED" ? (
              <Button variant="outline" disabled={busy !== null} onClick={() => void act("unapprove")}>
                Toch niet inplannen
              </Button>
            ) : (
              <Button disabled={busy !== null || rendering || dirty || !carousel.imageUrls} onClick={() => void act("approve")} title={dirty ? "Sla eerst je wijzigingen op" : undefined}>
                <Check className="mr-1.5 h-4 w-4" /> Goedkeuren &amp; inplannen
              </Button>
            )
          ) : null}
          {!locked ? (
            <Button
              variant="ghost"
              disabled={busy !== null}
              onClick={async () => {
                if (!window.confirm("Deze carousel verwijderen?")) return;
                const res = await fetch(`/api/admin/carousels/${carousel.id}`, { method: "DELETE" });
                if (res.ok) router.push("/admin/content/carousels");
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </header>

      {restored ? (
        <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">Niet-opgeslagen wijzigingen hersteld en opnieuw bewaard.</p>
      ) : null}
      {!locked && !uploaded ? (
        <p className="text-xs text-muted-foreground">
          {busy === "save" ? "Opslaan…" : dirty ? "Wijzigingen worden automatisch opgeslagen…" : savedAt ? `✓ Alles opgeslagen (${savedAt.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })})` : "✓ Alles opgeslagen"}
        </p>
      ) : null}
      {error || carousel.errorMessage || carousel.publishError ? (
        <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error ?? carousel.publishError ?? carousel.errorMessage}</p>
      ) : null}

      {/* The rendered slides, as they will appear on Instagram. */}
      <div className="flex snap-x gap-3 overflow-x-auto pb-2">
        {textStage && !carousel.imageUrls?.length ? (
          <div className="w-full rounded-2xl border border-white/70 bg-white/85 p-4 text-sm text-muted-foreground">
            {carousel.status === "WRITING"
              ? "AI schrijft je carousel… (± 1 à 2 minuten). Deze pagina vernieuwt vanzelf."
              : carousel.status === "DRAFT"
              ? "Lees de tekst hieronder na, pas aan waar nodig en klik op Tekst goedkeuren."
              : carousel.status === "TEXT_APPROVED"
                ? "Tekst goedgekeurd. Klik op Maak in Canva wanneer de carousel in je sjabloon mag worden ingevuld."
                : makingCanva
                ? "Je Canva-sjabloon wordt ingevuld (binnen ± 5 minuten, als de Claude-app openstaat). Daarna verschijnt Open in Canva."
                : carousel.status === "CANVA_EXPORT"
                ? "De slides worden uit Canva opgehaald (binnen ± 5 minuten). Daarna kun je goedkeuren en inplannen."
                : "In Canva: voeg je foto toe en werk af. Klaar? Klik op Slides ophalen uit Canva; daarna kun je hier goedkeuren en inplannen."}
          </div>
        ) : null}
        {textStage && ["IN_CANVA", "CANVA_EXPORT"].includes(carousel.status) ? (
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void dropSlides(e.dataTransfer.files);
            }}
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-6 text-center text-sm text-slate-600 hover:bg-white"
          >
            {busy === "upload" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            <span className="font-medium">Sneller: sleep hier je slides uit Canva</span>
            <span className="text-xs text-muted-foreground">In Canva: Delen → Downloaden → JPG of PNG (alle pagina&apos;s). Sleep de bestanden (of het uitgepakte mapje) hierheen.</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => void dropSlides(e.target.files)} />
          </label>
        ) : null}
        {textStage && !carousel.imageUrls?.length ? null : rendering || !carousel.imageUrls?.length ? (
          <div className="flex aspect-[4/5] w-72 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {fromCanvaLink ? "De slides worden uit Canva gehaald…" : "Canva vult je sjabloon in…"} (elk kwartier tussen 7 en 23 u)
          </div>
        ) : (
          carousel.imageUrls.map((url, i, all) => (
            <div key={url} className="w-72 shrink-0 snap-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Slide ${i + 1}`} className="aspect-[4/5] w-72 rounded-2xl object-cover shadow-sm" />
              {uploaded && !locked ? (
                <div className="mt-1 flex justify-center gap-1 text-xs">
                  <button
                    type="button"
                    disabled={i === 0 || busy !== null}
                    onClick={() => {
                      const next = [...all];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      void act("reorder", { imageUrls: next });
                    }}
                    className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-30"
                  >
                    ← naar voor
                  </button>
                  <button
                    type="button"
                    disabled={i === all.length - 1 || busy !== null}
                    onClick={() => {
                      const next = [...all];
                      [next[i + 1], next[i]] = [next[i], next[i + 1]];
                      void act("reorder", { imageUrls: next });
                    }}
                    className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-30"
                  >
                    naar achter →
                  </button>
                  <button
                    type="button"
                    disabled={all.length <= 2 || busy !== null}
                    onClick={() => void act("reorder", { imageUrls: all.filter((u) => u !== url) })}
                    className="rounded px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-30"
                  >
                    weg
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {false ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span>Achtergrondfoto:</span>
          <input
            value={photoQuery}
            onChange={(e) => setPhotoQuery(e.target.value)}
            placeholder={carousel.photoQuery ? `bv. ${carousel.photoQuery}` : "zoekterm (Engels), bv. green smoothie"}
            className="h-9 w-64 rounded-lg border border-slate-200 px-3"
          />
          <Button size="sm" variant="outline" disabled={busy !== null || rendering} onClick={() => void act("new-photo", photoQuery.trim() ? { query: photoQuery.trim() } : {})}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Andere foto
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 hover:bg-slate-50">
            {busy === "photo" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Eigen foto
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void ownPhoto(e.target.files)} />
          </label>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {uploaded ? (
          <section className="rounded-2xl border border-white/70 bg-white/85 p-4 text-sm text-muted-foreground">
            {fromCanvaLink ? (
              <>
                Carousel uit Canva. Iets aangepast in Canva?{" "}
                <button type="button" className="underline underline-offset-2" disabled={busy !== null || locked} onClick={() => void act("refresh-canva")}>
                  Slides opnieuw ophalen
                </button>
                . Volgorde en caption pas je hier aan.
              </>
            ) : (
              "Bestaande carousel: de slides blijven zoals je ze uploadde. Pas de volgorde aan onder de slides, en de caption hiernaast."
            )}
          </section>
        ) : (
          <section className="space-y-2">
            <h2 className="font-semibold text-slate-950">Tekst per slide</h2>
            <p className="text-sm text-muted-foreground">
              Foto&apos;s voeg je toe in Canva. Een extra slide komt vóór de call-to-action (maximaal 10).
            </p>
            <div className="divide-y divide-slate-100 rounded-2xl bg-white/85">
              {slides.map((slide, i) => {
                const value = (slide.type === "hook" ? slide.title : slide.text) ?? "";
                return (
                  <div key={i} className="group/slide grid grid-cols-[92px_1fr_24px] items-start gap-3 px-3 py-2">
                    <div className="pt-1.5 text-xs text-muted-foreground">
                      <p className="font-medium text-slate-700">{i + 1}. {slide.type === "hook" ? "Hook" : slide.type === "cta" ? "Call-to-action" : `Uitleg ${i}`}</p>
                      <p className={slide.type === "hook" && value.length > 55 ? "font-medium text-red-600" : undefined}>
                        {value.length} tekens{slide.type === "hook" && value.length > 55 ? " · te lang" : ""}
                      </p>
                    </div>
                    {slide.type === "hook" ? (
                      <div className="space-y-1">
                        <AutoTextarea
                          disabled={locked}
                          value={slide.title ?? ""}
                          onChange={(e) => editSlide(i, { title: e.target.value })}
                          placeholder="Hook in grote letters (max ± 55 tekens)"
                          className="min-h-0 resize-none border-transparent bg-transparent px-2 py-1.5 text-sm font-medium shadow-none hover:border-slate-200 focus:border-slate-300"
                        />
                        <AutoTextarea
                          disabled={locked}
                          value={slide.text ?? ""}
                          onChange={(e) => editSlide(i, { text: e.target.value })}
                          placeholder="Kleine tekst onderaan in Montserrat (optioneel): het tweede deel van een lange hook"
                          className="min-h-0 resize-none border-transparent bg-transparent px-2 py-1 text-xs shadow-none hover:border-slate-200 focus:border-slate-300"
                        />
                      </div>
                    ) : (
                    <AutoTextarea
                      disabled={locked}
                      value={value}
                      onChange={(e) => editSlide(i, { text: e.target.value })}
                      className="min-h-0 resize-none border-transparent bg-transparent px-2 py-1.5 text-sm shadow-none hover:border-slate-200 focus:border-slate-300"
                    />
                    )}
                    {slide.type === "body" && !locked ? (
                      <button
                        type="button"
                        onClick={() => removeSlide(i)}
                        className="mt-1.5 rounded p-1 text-slate-300 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover/slide:opacity-100"
                        aria-label={`Slide ${i + 1} verwijderen`}
                        title="Slide verwijderen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                );
              })}
            </div>
            {!locked && slides.length < 10 ? (
              <Button type="button" size="sm" variant="outline" onClick={addSlide}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Slide toevoegen
              </Button>
            ) : null}
            {boldWords(slides.flatMap((sl) => [sl.title, sl.text])).length ? (
              <p className="text-xs text-muted-foreground">
                Zet in Canva vet: <strong>{boldWords(slides.flatMap((sl) => [sl.title, sl.text])).join(", ")}</strong>
              </p>
            ) : null}
          </section>
        )}

        <aside className="space-y-4">
          <div className="space-y-2 rounded-2xl border border-white/70 bg-white/85 p-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-950">Caption</h2>
              {writingCaption ? (
                <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI schrijft…
                </span>
              ) : null}
            </div>
            <AutoTextarea
              disabled={locked}
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                setDirty(true);
              }}
            />
            <p className="text-right text-xs text-muted-foreground">{caption.length}/2200</p>
            {!locked ? (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <AutoTextarea
                  value={captionFeedback}
                  onChange={(e) => setCaptionFeedback(e.target.value)}
                  placeholder={carousel.caption ? "Feedback, bv. korter, minder opsomming, meer uitleg over insuline, ander comment-woord…" : "Wensen voor de caption (optioneel)"}
                  className="min-h-0 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== null || writingCaption || (carousel.source !== "AI" && !carousel.imageUrls) || dirty}
                  title={dirty ? "Sla eerst je wijzigingen op" : undefined}
                  onClick={async () => {
                    if (await act("write-caption", captionFeedback.trim() ? { feedback: captionFeedback.trim() } : {})) setCaptionFeedback("");
                  }}
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  {carousel.caption ? (captionFeedback.trim() ? "Herschrijven met deze feedback" : "Opnieuw laten schrijven") : "Laat AI schrijven"}
                </Button>
              </div>
            ) : null}
          </div>
          {!locked ? (
            <div className="space-y-2 rounded-2xl border border-white/70 bg-white/85 p-4 text-sm">
              <h2 className="font-semibold text-slate-950">Moment</h2>
              <input type="datetime-local" value={moment} onChange={(e) => setMoment(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-3" />
              <Button size="sm" variant="outline" disabled={busy !== null || !moment} onClick={() => void act("reschedule", { scheduledAt: new Date(moment).toISOString() })}>
                Moment wijzigen
              </Button>
            </div>
          ) : null}
          {dirty ? (
            <Button className="w-full" disabled={busy !== null} onClick={save}>
              {busy === "save" ? "Opslaan…" : "Opslaan"}
            </Button>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
