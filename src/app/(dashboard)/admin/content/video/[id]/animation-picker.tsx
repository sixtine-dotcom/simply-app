"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import emojiCatalog from "@/components/video-studio/emoji-catalog.json";

export type PickedAnimation = {
  kind: "lottie" | "video" | "image" | "motion" | "photos";
  /** kind "photos": 1-3 photos full screen (Unsplash). */
  srcs?: string[];
  layout?: "frame" | "grid";
  src: string;
  label: string;
  preview: string | null;
  /** B-roll clips: full-frame cutaway or picture-in-picture window. */
  fit?: "frame" | "window";
};

// Motion graphics drawn in code (see SimplyVideo.tsx → MotionGraphic).
const MOTION_GRAPHICS = [
  { src: "bloodSugar:spike", label: "Bloedsuiker: pieken en crashes" },
  { src: "bloodSugar:stable", label: "Bloedsuiker: stabiel" },
  { src: "bloodSugar:compare", label: "Bloedsuiker: pieken vs. stabiel" },
];

type LibraryAnimation = { id: string; name: string; kind: "lottie" | "video" | "image"; src: string; previewUrl: string | null; source: string };
type LottieResult = { id: string; name: string; src: string; previewUrl: string | null };
type Tab = "motion" | "unsplash" | "broll" | "giphy" | "emoji" | "lottie" | "library";
type UnsplashResult = { id: string; title: string; src: string; preview: string; author: string; downloadLocation: string };
type BrollResult = { id: string; src: string; preview: string; previewVideo: string };
type GiphyResult = { id: string; title: string; src: string; kind: "image" | "video"; preview: string };

const notoGif = (code: string) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/512.gif`;
const notoLottie = (code: string) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/lottie.json`;

/** Pick an animation: Google animated emoji, a free LottieFiles animation, or your own library (uploads). */
export function AnimationPicker({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (animation: PickedAnimation) => void;
  /** Kept for callers; GIPHY results do not depend on it. */
  orientation?: "portrait" | "landscape";
}) {
  const [tab, setTab] = useState<Tab>("motion");
  const [query, setQuery] = useState("");
  const [lottieQuery, setLottieQuery] = useState("");
  const [lottieResults, setLottieResults] = useState<LottieResult[] | null>(null);
  const [library, setLibrary] = useState<LibraryAnimation[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [brollQuery, setBrollQuery] = useState("");
  const [brollResults, setBrollResults] = useState<BrollResult[] | null>(null);
  const [brollFit, setBrollFit] = useState<"window" | "frame">("window");

  async function searchBroll(event?: React.FormEvent) {
    event?.preventDefault();
    if (!brollQuery.trim()) return;
    setBusy("broll");
    setError(null);
    const res = await fetch(`/api/admin/video/mixkit-search?q=${encodeURIComponent(brollQuery.trim())}`);
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setError(data.error || "Zoeken mislukt");
    setBrollResults(data.results ?? []);
  }

  const [unsplashQuery, setUnsplashQuery] = useState("");
  const [unsplashResults, setUnsplashResults] = useState<UnsplashResult[] | null>(null);
  const [unsplashPicked, setUnsplashPicked] = useState<UnsplashResult[]>([]);

  async function searchUnsplash(event?: React.FormEvent) {
    event?.preventDefault();
    if (!unsplashQuery.trim()) return;
    setBusy("unsplash");
    setError(null);
    const res = await fetch(`/api/admin/video/unsplash-search?q=${encodeURIComponent(unsplashQuery.trim())}`);
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(data.error || "Zoeken mislukt");
      return;
    }
    setUnsplashResults(data.results ?? []);
  }

  function addUnsplash(layout: "frame" | "grid") {
    if (!unsplashPicked.length) return;
    for (const p of unsplashPicked) {
      void fetch("/api/admin/video/unsplash-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ downloadLocation: p.downloadLocation }),
      });
    }
    pick({
      kind: "photos",
      src: unsplashPicked[0].src,
      srcs: unsplashPicked.map((p) => p.src),
      layout: unsplashPicked.length > 1 ? layout : "frame",
      label: `Foto's: ${unsplashPicked.map((p) => p.title).join(", ")}`.slice(0, 120),
      preview: unsplashPicked[0].preview,
    });
    setUnsplashPicked([]);
  }

  const [giphyQuery, setGiphyQuery] = useState("");
  const [giphyType, setGiphyType] = useState<"stickers" | "gifs">("stickers");
  const [giphyResults, setGiphyResults] = useState<GiphyResult[] | null>(null);

  async function searchGiphy(event?: React.FormEvent, type = giphyType) {
    event?.preventDefault();
    if (!giphyQuery.trim()) return;
    setBusy("giphy");
    setError(null);
    const res = await fetch(`/api/admin/video/giphy-search?q=${encodeURIComponent(giphyQuery.trim())}&type=${type}`);
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setError(data.error || "Zoeken mislukt");
    setGiphyResults(data.results ?? []);
  }

  useEffect(() => {
    if (!open || library) return;
    fetch("/api/admin/video/animations", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLibrary(d.animations ?? []))
      .catch(() => setLibrary([]));
  }, [open, library]);

  const emoji = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (emojiCatalog as Array<{ emoji: string; name: string; tags: string[]; code: string }>).filter(
      (e) => !q || e.name.includes(q) || e.tags.some((t) => t.includes(q)) || e.emoji === q
    );
  }, [query]);

  function pick(animation: PickedAnimation) {
    onPick(animation);
    onOpenChange(false);
  }

  async function searchLottie(event?: React.FormEvent) {
    event?.preventDefault();
    if (!lottieQuery.trim()) return;
    setBusy("search");
    setError(null);
    const res = await fetch(`/api/admin/video/lottie-search?q=${encodeURIComponent(lottieQuery.trim())}`);
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setError(data.error || "Zoeken mislukt");
    setLottieResults(data.results ?? []);
  }

  async function saveToLibrary(item: Omit<LibraryAnimation, "id">) {
    const res = await fetch("/api/admin/video/animations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, tags: [] }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.animation) {
      setLibrary((list) => [data.animation, ...(list ?? []).filter((a) => a.id !== data.animation.id)]);
    }
  }

  async function upload(file: File) {
    setBusy("upload");
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setError(data.error || "Upload mislukt");
    const kind = data.type === "video" ? "video" : "image";
    const name = file.name.replace(/\.[^.]+$/, "");
    await saveToLibrary({ name, kind, src: data.url, previewUrl: kind === "image" ? data.url : null, source: "upload" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Kies een animatie</DialogTitle>
          <DialogDescription>Geanimeerde emoji, gratis animaties van LottieFiles, of je eigen uploads (bv. uit Canva).</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1 rounded-full border border-slate-200 bg-white p-1 text-sm" role="tablist">
          {(
            [
              ["motion", "Motion graphics"],
              ["broll", "B-roll (Mixkit)"],
              ["unsplash", "Foto's (Unsplash)"],
              ["giphy", "GIPHY"],
              ["emoji", "Emoji"],
              ["lottie", "LottieFiles"],
              ["library", "Mijn bibliotheek"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn("flex-1 rounded-full px-3 py-1.5", tab === key ? "bg-slate-900 text-white" : "text-slate-600")}
            >
              {label}
            </button>
          ))}
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {tab === "motion" ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {MOTION_GRAPHICS.map((m) => (
              <button
                key={m.src}
                type="button"
                onClick={() => pick({ kind: "motion", src: m.src, label: m.label, preview: null })}
                className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-left text-sm text-white hover:border-slate-900"
              >
                <svg viewBox="0 0 100 40" className="mb-2 h-10 w-full">
                  {m.src !== "bloodSugar:stable" ? (
                    <path d="M0 26 C10 26 14 4 22 6 S30 36 36 34 S46 6 54 8 S62 36 70 34 S80 8 88 10 S96 28 100 26" fill="none" stroke="white" strokeWidth="2" />
                  ) : null}
                  {m.src !== "bloodSugar:spike" ? <path d="M0 20 C20 18 30 22 50 19 S80 21 100 19" fill="none" stroke="#B9D7A8" strokeWidth="2" /> : null}
                </svg>
                {m.label}
              </button>
            ))}
            <p className="text-xs text-muted-foreground sm:col-span-3">Een lijn die zich tekent, achter je hoofd. Meer motion graphics kunnen erbij.</p>
          </div>
        ) : null}

        {tab === "broll" ? (
          <div className="space-y-3">
            <form onSubmit={searchBroll} className="flex gap-2">
              <Input value={brollQuery} onChange={(e) => setBrollQuery(e.target.value)} placeholder="Eén Engels woord werkt best: breakfast, fruit, yoga, sleep, kitchen…" />
              <Button type="submit" disabled={busy === "broll"}>
                {busy === "broll" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Zoeken"}
              </Button>
            </form>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Tonen als:</span>
              {(
                [
                  ["window", "Venster naast je"],
                  ["frame", "Volledig beeld (kort)"],
                ] as const
              ).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setBrollFit(key)} className={cn("rounded-full border px-3 py-1", brollFit === key ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200")}>
                  {label}
                </button>
              ))}
              <span className="ml-auto text-muted-foreground">{busy === "copy" ? "Clip wordt toegevoegd…" : "Gratis beelden van Mixkit"}</span>
            </div>
            <div className="grid max-h-[50vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {(brollResults ?? []).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={busy !== null}
                  onClick={async () => {
                    setBusy("copy");
                    setError(null);
                    const res = await fetch("/api/admin/video/broll-copy", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ url: r.src }),
                    });
                    const data = await res.json().catch(() => ({}));
                    setBusy(null);
                    if (!res.ok) return setError(data.error || "Clip toevoegen mislukt");
                    pick({ kind: "video", src: data.url, label: `B-roll: ${brollQuery}`, preview: r.preview, fit: brollFit });
                  }}
                  className="group relative aspect-video overflow-hidden rounded-xl border border-slate-100 bg-slate-900 hover:border-slate-900"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.preview} alt="" loading="lazy" className="h-full w-full object-cover group-hover:hidden" />
                  <video src={r.previewVideo} muted loop playsInline preload="none" className="hidden h-full w-full object-cover group-hover:block" onMouseEnter={(e) => void e.currentTarget.play()} />
                </button>
              ))}
              {brollResults && brollResults.length === 0 ? <p className="col-span-full text-sm text-muted-foreground">Geen resultaten. Probeer één eenvoudig Engels woord.</p> : null}
            </div>
          </div>
        ) : null}

        {tab === "unsplash" ? (
          <div className="space-y-3">
            <form onSubmit={searchUnsplash} className="flex gap-2">
              <Input value={unsplashQuery} onChange={(e) => setUnsplashQuery(e.target.value)} placeholder="Zoek (Engels werkt best): fiber bowl, lentils, healthy breakfast…" />
              <Button type="submit" disabled={busy === "unsplash"}>
                {busy === "unsplash" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Zoeken"}
              </Button>
            </form>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Kies 1 tot 3 foto&apos;s. Ze komen op volledig scherm op het huidige moment in de video.</span>
              {unsplashPicked.length ? (
                <span className="ml-auto flex gap-2">
                  <Button type="button" size="sm" onClick={() => addUnsplash("frame")}>
                    {unsplashPicked.length === 1 ? "Foto toevoegen" : `${unsplashPicked.length} foto's na elkaar`}
                  </Button>
                  {unsplashPicked.length > 1 ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => addUnsplash("grid")}>
                      {unsplashPicked.length} foto&apos;s onder elkaar
                    </Button>
                  ) : null}
                </span>
              ) : null}
            </div>
            <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {(unsplashResults ?? []).map((r) => {
                const index = unsplashPicked.findIndex((p) => p.id === r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    title={`${r.title} · foto: ${r.author}`}
                    onClick={() =>
                      setUnsplashPicked((all) => (index >= 0 ? all.filter((p) => p.id !== r.id) : all.length >= 3 ? all : [...all, r]))
                    }
                    className={cn(
                      "relative aspect-[9/16] overflow-hidden rounded-xl border-2",
                      index >= 0 ? "border-slate-900" : "border-transparent hover:border-slate-300"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.preview} alt={r.title} loading="lazy" className="h-full w-full object-cover" />
                    {index >= 0 ? (
                      <span className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs text-white">{index + 1}</span>
                    ) : null}
                  </button>
                );
              })}
              {unsplashResults && unsplashResults.length === 0 ? <p className="col-span-full text-sm text-muted-foreground">Geen resultaten.</p> : null}
            </div>
            <p className="text-right text-[11px] text-muted-foreground">Foto&apos;s van Unsplash</p>
          </div>
        ) : null}

        {tab === "giphy" ? (
          <div className="space-y-3">
            <form onSubmit={searchGiphy} className="flex gap-2">
              <Input value={giphyQuery} onChange={(e) => setGiphyQuery(e.target.value)} placeholder="Zoek: sparkle, heart, wow, healthy, brain…" />
              <Button type="submit" disabled={busy === "giphy"}>
                {busy === "giphy" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Zoeken"}
              </Button>
            </form>
            <div className="flex items-center gap-2 text-xs">
              {(
                [
                  ["stickers", "Stickers (transparant)"],
                  ["gifs", "GIF's (in een venster)"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setGiphyType(key);
                    if (giphyQuery.trim()) void searchGiphy(undefined, key);
                  }}
                  className={cn("rounded-full border px-3 py-1", giphyType === key ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200")}
                >
                  {label}
                </button>
              ))}
              <span className="ml-auto font-semibold tracking-wide text-slate-500">Powered by GIPHY</span>
            </div>
            <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {(giphyResults ?? []).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  title={r.title}
                  onClick={() =>
                    pick(
                      r.kind === "video"
                        ? { kind: "video", src: r.src, label: `GIF: ${r.title}`, preview: r.preview, fit: "window" }
                        : { kind: "image", src: r.src, label: `Sticker: ${r.title}`, preview: r.preview }
                    )
                  }
                  className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-[conic-gradient(#f1f5f9_25%,#fff_0_50%,#f1f5f9_0_75%,#fff_0)] bg-[length:16px_16px] p-1 hover:border-slate-900"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.preview} alt={r.title} loading="lazy" className="h-full w-full object-contain" />
                </button>
              ))}
              {giphyResults && giphyResults.length === 0 ? <p className="col-span-full text-sm text-muted-foreground">Geen resultaten.</p> : null}
            </div>
          </div>
        ) : null}

        {tab === "emoji" ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zoek: fruit, stress, slaap…" className="pl-9" />
            </div>
            <div className="grid max-h-[50vh] grid-cols-6 gap-2 overflow-y-auto sm:grid-cols-8">
              {emoji.map((e) => (
                <button
                  key={e.code}
                  type="button"
                  title={e.name}
                  onClick={() => pick({ kind: "lottie", src: notoLottie(e.code), label: `${e.emoji} ${e.name}`, preview: notoGif(e.code) })}
                  className="flex aspect-square items-center justify-center rounded-xl border border-slate-100 bg-white p-1.5 hover:border-slate-900"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={notoGif(e.code)} alt={e.name} loading="lazy" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "lottie" ? (
          <div className="space-y-3">
            <form onSubmit={searchLottie} className="flex gap-2">
              <Input value={lottieQuery} onChange={(e) => setLottieQuery(e.target.value)} placeholder="Zoek in het Engels: banana, blood sugar, gut, sleep…" />
              <Button type="submit" disabled={busy === "search"}>
                {busy === "search" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Zoeken"}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">Gekozen animaties worden ook in Mijn bibliotheek bewaard, zodat Claude ze later zelf kan gebruiken.</p>
            <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {(lottieResults ?? []).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  title={r.name}
                  onClick={() => {
                    void saveToLibrary({ name: r.name, kind: "lottie", src: r.src, previewUrl: r.previewUrl, source: "lottiefiles" });
                    pick({ kind: "lottie", src: r.src, label: r.name, preview: r.previewUrl });
                  }}
                  className="flex aspect-square items-center justify-center rounded-xl border border-slate-100 bg-white p-2 hover:border-slate-900"
                >
                  {r.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.previewUrl} alt={r.name} loading="lazy" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xs">{r.name}</span>
                  )}
                </button>
              ))}
              {lottieResults && lottieResults.length === 0 ? <p className="col-span-full text-sm text-muted-foreground">Geen resultaten.</p> : null}
            </div>
          </div>
        ) : null}

        {tab === "library" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" disabled={busy === "upload"} onClick={() => fileRef.current?.click()}>
                {busy === "upload" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Uploaden (GIF, MP4, PNG)
              </Button>
              <span className="text-xs text-muted-foreground">Bv. een animatie die je in Canva exporteert.</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/gif,image/png,image/webp,video/mp4,video/webm"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                  e.target.value = "";
                }}
              />
            </div>
            {!library ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Laden…
              </p>
            ) : library.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog leeg. Kies iets bij LottieFiles of upload een eigen animatie.</p>
            ) : (
              <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                {library.map((a) => (
                  <div key={a.id} className="group relative">
                    <button
                      type="button"
                      title={a.name}
                      onClick={() => pick({ kind: a.kind, src: a.src, label: a.name, preview: a.previewUrl })}
                      className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border border-slate-100 bg-white p-2 hover:border-slate-900"
                    >
                      {a.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.previewUrl} alt={a.name} loading="lazy" className="h-full w-full object-contain" />
                      ) : a.kind === "video" ? (
                        <video src={a.src} muted loop autoPlay playsInline className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-xs">{a.name}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={`Verwijder ${a.name} uit bibliotheek`}
                      onClick={async () => {
                        await fetch(`/api/admin/video/animations/${a.id}`, { method: "DELETE" });
                        setLibrary((list) => (list ?? []).filter((x) => x.id !== a.id));
                      }}
                      className="absolute right-1 top-1 hidden rounded-full bg-white p-1 text-red-600 shadow group-hover:block"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
