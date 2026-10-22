"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronRight, Clock3, FolderOpen, Film, HardDriveUpload, Image as ImageIcon, Images, Loader2, Plus, RefreshCw, Save, Search, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Category, SWATCHES, loadCategories, nextAvailableColor, saveCategories, swatchFor, type ColorKey } from "./categories";
import {
  ContentDraft,
  ContentPublication,
  DriveVideo,
  PLATFORMS,
  deleteDraftFromStorage,
  formatSize,
  platformMeta,
  saveDraftToStorage,
} from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDraft: ContentDraft | null;
  initialDate?: string | null;
  googleConfigured: boolean;
  googleConnected: boolean;
  googleEmail: string | null;
  hasDriveReadScope: boolean;
  connectHref: string;
  canvaConnected: boolean;
  instagramConnected: boolean;
  facebookConnected: boolean;
  tiktokConnected: boolean;
  onSaved: (draft: ContentDraft) => void;
  onDeleted: (videoId: string) => void;
};

type CanvaDesign = {
  id: string;
  title?: string;
  page_count?: number;
  thumbnail?: { url: string };
};

function emptyOccurrence(base?: ContentPublication): ContentPublication {
  return {
    id: crypto.randomUUID(),
    scheduledAt: "",
    platforms: base?.platforms?.length ? base.platforms : ["instagram"],
    caption: base?.caption ?? "",
    format: base?.format ?? "reel",
  };
}

export function ContentPlannerDialog({
  open,
  onOpenChange,
  initialDraft,
  googleConfigured,
  googleConnected,
  googleEmail,
  hasDriveReadScope,
  connectHref,
  canvaConnected,
  instagramConnected,
  facebookConnected,
  tiktokConnected,
  initialDate,
  onSaved,
  onDeleted,
}: Props) {
  const { toast } = useToast();
  const driveReady = googleConnected && hasDriveReadScope;
  const needsReconnect = googleConnected && !hasDriveReadScope;

  const [phase, setPhase] = useState<"pick" | "canva" | "details">("pick");
  const [videos, setVideos] = useState<DriveVideo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [canvaDesigns, setCanvaDesigns] = useState<CanvaDesign[]>([]);
  const [canvaLoading, setCanvaLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [selectedVideo, setSelectedVideo] = useState<DriveVideo | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [occurrences, setOccurrences] = useState<ContentPublication[]>([emptyOccurrence()]);

  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState<ColorKey>("pink");
  const [mediaMenuOpen, setMediaMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const cats = loadCategories();
    setCategories(cats);
    setSearch("");
    setError("");
    setNewCategoryOpen(false);
    setMediaMenuOpen(false);
    setNewCategoryName("");
    setLocalPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
    if (initialDraft) {
      setPhase("details");
      setSelectedVideo(initialDraft.video);
      setCategoryId(initialDraft.categoryId || cats[0]?.id || "");
      setOccurrences(initialDraft.publications.length ? initialDraft.publications.map((item) => ({ ...item })) : [emptyOccurrence()]);
    } else {
      setPhase("details");
      setSelectedVideo({
        id: `empty-${crypto.randomUUID()}`,
        name: "Nog geen foto of video gekozen",
        mimeType: "video/mp4",
        modifiedTime: new Date().toISOString(),
      });
      setCategoryId(cats[0]?.id || "");
      setOccurrences([{ ...emptyOccurrence(), scheduledAt: initialDate ? (initialDate.includes("T") ? initialDate : `${initialDate}T12:00`) : "" }]);
    }
  }, [open, initialDraft, initialDate]);

  async function loadVideos() {
    setLoading(true);
    setError("");
    try {
      const query = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const response = await fetch(`/api/admin/content/drive/videos${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kon video's niet ophalen");
      setVideos(data.videos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kon video's niet ophalen");
    } finally {
      setLoading(false);
    }
  }

  async function openCanvaPicker() {
    setMediaMenuOpen(false);
    if (!canvaConnected) {
      window.location.href = "/api/integrations/canva/connect";
      return;
    }
    setPhase("canva");
    setCanvaLoading(true);
    setError("");
    try {
      const response = await fetch("/api/integrations/canva/designs");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kon Canva-designs niet ophalen");
      setCanvaDesigns(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kon Canva-designs niet ophalen");
    } finally {
      setCanvaLoading(false);
    }
  }

  async function importCanvaDesign(design: CanvaDesign) {
    setCanvaLoading(true);
    setError("");
    try {
      const start = await fetch("/api/integrations/canva/exports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ designId: design.id }) });
      let data = await start.json();
      if (!start.ok) throw new Error(data.error || "Canva-export mislukt");
      const jobId = data.job?.id;
      for (let attempt = 0; jobId && data.job?.status === "in_progress" && attempt < 30; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const status = await fetch(`/api/integrations/canva/exports?jobId=${encodeURIComponent(jobId)}`);
        data = await status.json();
        if (!status.ok) throw new Error(data.error || "Canva-export mislukt");
      }
      const urls = data.job?.urls as string[] | undefined;
      if (!urls?.length) throw new Error("Canva heeft de export nog niet afgerond");
      chooseVideo({ id: `canva-${design.id}`, name: design.title || "Canva-carrousel", mimeType: "image/png", modifiedTime: new Date().toISOString(), thumbnailLink: urls[0], mediaUrls: urls, source: "canva" });
      toast({ title: urls.length > 1 ? `${urls.length} Canva-pagina's geïmporteerd` : "Canva-design geïmporteerd" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Canva-import mislukt");
    } finally {
      setCanvaLoading(false);
    }
  }

  useEffect(() => {
    if (open && phase === "pick" && driveReady) void loadVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase, driveReady]);

  function chooseVideo(video: DriveVideo, previewUrl = "") {
    setSelectedVideo(video);
    setLocalPreviewUrl((current) => {
      if (current && current !== previewUrl) URL.revokeObjectURL(current);
      return previewUrl;
    });
    setPhase("details");
  }

  function chooseDesktopFile(file?: File) {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    chooseVideo({
      id: `desktop-${crypto.randomUUID()}`,
      name: file.name,
      mimeType: file.type || "video/mp4",
      modifiedTime: new Date(file.lastModified || Date.now()).toISOString(),
      size: String(file.size),
    }, previewUrl);
  }

  function openDesktopPicker(type: "image" | "video") {
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = type === "image" ? "image/*" : "video/*";
    fileInputRef.current.value = "";
    fileInputRef.current.click();
    setMediaMenuOpen(false);
  }

  function updateDate(id: string, date: string) {
    const current = occurrences.find((item) => item.id === id)?.scheduledAt;
    const time = current?.includes("T") ? current.split("T")[1] : "12:00";
    updateOccurrence(id, { scheduledAt: date ? `${date}T${time}` : "" });
  }

  function updateTime(id: string, time: string) {
    const current = occurrences.find((item) => item.id === id)?.scheduledAt;
    const date = current?.includes("T") ? current.split("T")[0] : new Date().toISOString().slice(0, 10);
    updateOccurrence(id, { scheduledAt: `${date}T${time}` });
  }

  function updateOccurrence(id: string, patch: Partial<ContentPublication>) {
    setOccurrences((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function togglePlatform(id: string, platformId: string) {
    setOccurrences((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, platforms: item.platforms.includes(platformId) ? item.platforms.filter((p) => p !== platformId) : [...item.platforms, platformId] }
          : item
      )
    );
  }

  function addOccurrence() {
    setOccurrences((current) => [...current, emptyOccurrence(current[0])]);
  }

  function removeOccurrence(id: string) {
    setOccurrences((current) => current.filter((item) => item.id !== id));
  }

  function addCategory() {
    if (!newCategoryName.trim()) return;
    const category: Category = { id: crypto.randomUUID(), name: newCategoryName.trim(), color: newCategoryColor };
    const next = [...categories, category];
    setCategories(next);
    saveCategories(next);
    setCategoryId(category.id);
    setNewCategoryName("");
    setNewCategoryOpen(false);
  }

  function handleSave() {
    if (!selectedVideo) return;
    if (selectedVideo.id.startsWith("empty-")) {
      toast({ title: "Voeg eerst een foto of video toe" });
      return;
    }
    if (!categoryId) {
      toast({ title: "Kies eerst een hoek", description: "Elke post krijgt een hoek zodat je kalender duidelijk blijft." });
      return;
    }
    const valid = occurrences.filter((item) => item.scheduledAt);
    if (!valid.length) {
      toast({ title: "Kies minstens één publicatiedatum" });
      return;
    }
    const invalidTime = valid.find((item) => {
      const date = new Date(item.scheduledAt);
      return date.getHours() < 6 || date.getHours() >= 22 || ![0, 30].includes(date.getMinutes());
    });
    if (invalidTime) {
      toast({
        title: "Kies een zichtbaar tijdvak",
        description: "Plan content op een half uur tussen 06:00 en 21:30.",
      });
      return;
    }
    const draft: ContentDraft = {
      video: selectedVideo,
      categoryId,
      publications: valid.map((item) => ({ ...item, platforms: item.platforms.length ? item.platforms : ["instagram"] })),
      savedAt: new Date().toISOString(),
    };
    saveDraftToStorage(draft);
    onSaved(draft);
    toast({
      title: initialDraft ? "Post bijgewerkt" : "Content ingepland",
      description: `${valid.length} moment${valid.length === 1 ? "" : "en"} op de kalender gezet.`,
    });
    onOpenChange(false);
  }

  function handleDelete() {
    if (!initialDraft) return;
    deleteDraftFromStorage(initialDraft.video.id);
    onDeleted(initialDraft.video.id);
    toast({ title: "Post verwijderd" });
    onOpenChange(false);
  }

  async function publishNow() {
    if (!selectedVideo || !occurrences[0]) return;
    const urls = selectedVideo.mediaUrls?.length
      ? selectedVideo.mediaUrls
      : selectedVideo.thumbnailLink?.startsWith("https://")
        ? [selectedVideo.thumbnailLink]
        : [];
    if (!urls.length) {
      toast({ title: "Deze media is nog niet online beschikbaar", description: "Gebruik voor de eerste test een Canva-design. De app importeert dat automatisch naar publieke opslag." });
      return;
    }
    setPublishing(true);
    try {
      const response = await fetch("/api/integrations/meta/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media: urls.map((url) => ({ url, type: selectedVideo.mimeType.startsWith("video/") ? "video" : "image" })),
          caption: occurrences[0].caption,
          tiktokCaption: occurrences[0].tiktokCaption,
          format: occurrences[0].format,
          platforms: occurrences[0].platforms,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Publiceren mislukt");
      const failed = Object.entries((data.errors || {}) as Record<string, string>);
      if (failed.length) {
        toast({ title: "Deels gepubliceerd", description: failed.map(([platform, message]) => `${platformMeta(platform).label}: ${message}`).join(" · ") });
      } else {
        const privateNote = data.tiktokPrivacy === "SELF_ONLY" ? " TikTok staat op privé zolang je TikTok-app niet goedgekeurd is." : "";
        toast({ title: "Gepubliceerd", description: `De post is naar je geselecteerde kanalen verstuurd.${privateNote}` });
      }
    } catch (err) {
      toast({ title: "Publiceren mislukt", description: err instanceof Error ? err.message : "Controleer je koppelingen." });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-screen max-h-screen w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-slate-100 p-0 sm:rounded-none">
        <DialogHeader className="shrink-0 border-b border-border bg-slate-100 px-8 py-6">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            {phase === "pick" ? "Kies je foto of video" : phase === "canva" ? "Kies een Canva-design" : "Nieuwe post maken"}
            {phase === "details" ? <span className="rounded-full border border-border bg-white px-3 py-1 text-sm font-semibold text-slate-700">🌿 Simply In Balance</span> : null}
          </DialogTitle>
          <DialogDescription>
            {phase === "pick"
              ? "Upload vanaf je computer of kies een bestand uit Google Drive of Canva."
              : phase === "canva" ? "Een design met meerdere pagina's wordt automatisch als volledige carrousel geïmporteerd."
              : selectedVideo?.name}
          </DialogDescription>
        </DialogHeader>

        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(event) => chooseDesktopFile(event.target.files?.[0])} />

        {phase === "pick" ? (
          <div className="mx-auto w-full max-w-4xl space-y-4 overflow-y-auto px-6 py-8">
            <div className="grid gap-3 sm:grid-cols-3">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-border bg-white p-4 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5">
                <HardDriveUpload className="mb-2 h-5 w-5 text-primary" />
                Computer
              </button>
              <button type="button" onClick={() => driveReady ? void loadVideos() : undefined} className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-border bg-white p-4 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5">
                <FolderOpen className="mb-2 h-5 w-5 text-primary" />
                Google Drive
              </button>
              <a href="https://www.canva.com/" target="_blank" rel="noreferrer" className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-border bg-white p-4 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5">
                <span className="mb-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 text-[10px] font-bold text-white">C</span>
                Canva
                <span className="mt-1 text-[11px] font-normal text-muted-foreground">Open en download</span>
              </a>
            </div>
            {!googleConfigured ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-medium">Google Drive moet nog technisch worden ingesteld</p>
                <p className="mt-1 text-amber-800">Voor echte Drive-bestanden ontbreken nog de Google Client ID en Client Secret. Gebruik ondertussen het testconcept hieronder.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() =>
                    chooseVideo({ id: `manual-${crypto.randomUUID()}`, name: "Testvideo voor contentplanning", mimeType: "video/mp4", modifiedTime: new Date().toISOString() })
                  }
                >
                  Testconcept gebruiken
                </Button>
              </div>
            ) : !driveReady ? (
              <div className="rounded-2xl border border-border bg-muted/25 p-4">
                <p className="text-sm font-medium text-slate-900">{needsReconnect ? "Nieuwe Drive-toestemming nodig" : "Google Drive nog niet verbonden"}</p>
                <p className="mt-1 text-sm text-muted-foreground">Verbind je Google-account om video&apos;s rechtstreeks vanuit Drive te kiezen.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <a href={connectHref}>
                      <FolderOpen className="mr-2 h-4 w-4" />
                      {needsReconnect ? "Drive opnieuw verbinden" : "Drive verbinden"}
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      chooseVideo({ id: `manual-${crypto.randomUUID()}`, name: "Testvideo voor contentplanning", mimeType: "video/mp4", modifiedTime: new Date().toISOString() })
                    }
                  >
                    Testconcept gebruiken
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Verbonden met {googleEmail}</p>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && driveReady) void loadVideos();
                  }}
                  placeholder="Zoek op bestandsnaam"
                  className="pl-9"
                  disabled={!driveReady}
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => void loadVideos()} disabled={loading || !driveReady}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>

            {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {videos.map((video) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => chooseVideo(video)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  {video.thumbnailLink ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={video.thumbnailLink} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Film className="h-4 w-4 text-muted-foreground" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{video.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {formatSize(video.size)}
                      {video.modifiedTime ? ` · ${new Date(video.modifiedTime).toLocaleDateString("nl-BE")}` : ""}
                    </span>
                  </span>
                </button>
              ))}
              {!loading && videos.length === 0 && driveReady ? (
                <div className="flex min-h-32 flex-col items-center justify-center text-center">
                  <FolderOpen className="h-7 w-7 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium text-slate-900">Geen videobestanden gevonden</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">Pas je zoekopdracht aan of voeg video&apos;s toe aan Google Drive.</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : phase === "canva" ? (
          <div className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto p-8">
            <div className="mb-5 flex items-center justify-between"><Button type="button" variant="outline" onClick={() => setPhase("details")}>Terug naar post</Button><span className="text-sm text-muted-foreground">{canvaDesigns.length} designs</span></div>
            {error ? <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            {canvaLoading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {canvaDesigns.map((design) => (
                  <button key={design.id} type="button" onClick={() => void importCanvaDesign(design)} className="overflow-hidden rounded-2xl border border-border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    {design.thumbnail?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={design.thumbnail.url} alt="" className="aspect-video w-full object-cover" />
                    ) : <div className="flex aspect-video items-center justify-center bg-muted"><Images className="h-7 w-7 text-muted-foreground" /></div>}
                    <div className="p-3"><p className="truncate text-sm font-semibold text-slate-900">{design.title || "Naamloos design"}</p><p className="mt-1 text-xs text-muted-foreground">{design.page_count || 1} pagina{design.page_count === 1 ? "" : "'s"}</p></div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : selectedVideo ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,39%)] lg:overflow-hidden">
            <div className="min-h-0 space-y-3 overflow-y-auto rounded-xl bg-white p-4">
            <div className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
              {PLATFORMS.map((platform) => {
                const active = occurrences[0]?.platforms.includes(platform.id);
                const Icon = platform.icon;
                return (
                  <button key={platform.id} type="button" onClick={() => occurrences[0] && togglePlatform(occurrences[0].id, platform.id)} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors", active ? platform.chip : "border-border bg-white text-muted-foreground hover:bg-muted/40")}>
                    <Icon className="h-4 w-4" />
                    {platform.label}
                  </button>
                );
              })}
              <span className="ml-auto text-xs text-muted-foreground">Instagram, Facebook en TikTok kunnen samen</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
              {selectedVideo.thumbnailLink ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedVideo.thumbnailLink} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-900/90">
                  <Film className="h-4 w-4 text-white" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{selectedVideo.name}</p>
                {selectedVideo.webViewLink ? (
                  <a href={selectedVideo.webViewLink} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                    Bekijk video in Drive
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground">Foto of video voor deze publicatie</p>
                )}
              </div>
              <div className="relative">
                <Button type="button" variant="outline" size="sm" onClick={() => setMediaMenuOpen((current) => !current)}>
                  <Images className="mr-1.5 h-4 w-4" />
                  Media toevoegen
                </Button>
                {mediaMenuOpen ? (
                  <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-border bg-white py-2 text-sm shadow-xl">
                    <button type="button" onClick={() => openDesktopPicker("image")} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/60">
                      <ImageIcon className="h-4 w-4" />
                      Afbeelding toevoegen
                    </button>
                    <button type="button" onClick={() => openDesktopPicker("video")} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/60">
                      <Video className="h-4 w-4" />
                      Video toevoegen
                    </button>
                    <div className="my-1 border-t border-border" />
                    <button type="button" onClick={() => { setMediaMenuOpen(false); setPhase("pick"); }} className="flex w-full items-center gap-3 bg-lime-50/60 px-4 py-2.5 text-left hover:bg-lime-100/70">
                      <FolderOpen className="h-4 w-4 text-emerald-600" />
                      Google Drive
                    </button>
                    <button type="button" onClick={() => void openCanvaPicker()} className="flex w-full items-center gap-3 bg-lime-50/60 px-4 py-2.5 text-left hover:bg-lime-100/70">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 text-[9px] font-bold text-white">C</span>
                      {canvaConnected ? "Kies uit Canva" : "Canva koppelen"}
                      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hoek van deze post</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const swatch = swatchFor(category.color);
                  const active = categoryId === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setCategoryId(category.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                        active ? cn(swatch.bg, swatch.text, swatch.border) : "border-border bg-white text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      <span className={cn("h-2.5 w-2.5 rounded-full", swatch.dot)} />
                      {category.name}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setNewCategoryColor(nextAvailableColor(categories));
                    setNewCategoryOpen((value) => !value);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nieuwe hoek
                </button>
              </div>
              {newCategoryOpen ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
                  <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Naam van de hoek" className="h-9 max-w-48" />
                  <div className="flex gap-1.5">
                    {SWATCHES.map((swatch) => (
                      <button
                        key={swatch.key}
                        type="button"
                        title={swatch.label}
                        onClick={() => setNewCategoryColor(swatch.key)}
                        className={cn(
                          "h-6 w-6 rounded-full ring-2 ring-offset-1 transition-shadow",
                          swatch.dot,
                          newCategoryColor === swatch.key ? "ring-slate-900" : "ring-transparent"
                        )}
                      />
                    ))}
                  </div>
                  <Button type="button" size="sm" onClick={addCategory}>
                    Toevoegen
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              {occurrences.map((occurrence, index) => (
                <div key={occurrence.id} className="space-y-3 rounded-xl border border-border bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{index === 0 ? "Publicatiemoment" : `Herhaling ${index}`}</p>
                    {occurrences.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeOccurrence(occurrence.id)}
                        className="text-muted-foreground transition-colors hover:text-red-600"
                        title="Dit moment verwijderen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-xs font-medium text-muted-foreground">Type</span>
                    {(["reel", "post"] as const).map((format) => (
                      <button key={format} type="button" onClick={() => updateOccurrence(occurrence.id, { format })} className={cn("rounded-xl border px-3 py-2 text-xs font-semibold", (occurrence.format || "reel") === format ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-muted-foreground")}>
                        {format === "reel" ? "Reel" : "Gewone post"}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label>Datum</Label>
                      <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9" type="date" value={occurrence.scheduledAt?.split("T")[0] || ""} onChange={(e) => updateDate(occurrence.id, e.target.value)} />
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Tijdstip</Label>
                      <div className="relative">
                        <Clock3 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <select className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm" value={occurrence.scheduledAt?.split("T")[1] || "12:00"} onChange={(e) => updateTime(occurrence.id, e.target.value)}>
                          {Array.from({ length: 32 }, (_, index) => {
                            const minutes = 360 + index * 30;
                            const value = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
                            return <option key={value} value={value}>{value}</option>;
                          })}
                        </select>
                      </div>
                    </div>
                    <div className="grid gap-1.5 sm:col-span-2">
                      <Label>Publiceren op</Label>
                      <div className="flex gap-2">
                        {PLATFORMS.map((platform) => {
                          const active = occurrence.platforms.includes(platform.id);
                          const Icon = platform.icon;
                          return (
                            <button
                              key={platform.id}
                              type="button"
                              onClick={() => togglePlatform(occurrence.id, platform.id)}
                              className={cn(
                                "flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-medium transition-colors",
                                active ? platform.chip : "border-border bg-white text-muted-foreground hover:bg-muted/40"
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {platform.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Caption</Label>
                    <Textarea
                      value={occurrence.caption}
                      onChange={(e) => updateOccurrence(occurrence.id, { caption: e.target.value })}
                      placeholder={index === 0 ? "Schrijf hier je caption…" : "Zelfde caption, evt. licht aangepast (bv. andere datum genoemd)…"}
                      className="min-h-44 resize-y border-slate-300"
                    />
                  </div>
                  {occurrence.platforms.includes("tiktok") ? (
                    <div className="grid gap-1.5">
                      <Label>Caption voor TikTok (optioneel)</Label>
                      <Textarea
                        value={occurrence.tiktokCaption ?? ""}
                        onChange={(e) => updateOccurrence(occurrence.id, { tiktokCaption: e.target.value })}
                        placeholder="Leeg laten = dezelfde caption als hierboven. Max. 2.200 tekens."
                        maxLength={2200}
                        className="min-h-28 resize-y border-slate-300"
                      />
                    </div>
                  ) : null}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addOccurrence} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                {occurrences.length > 1 ? "Nog een moment toevoegen" : "Ook op een andere datum plannen"}
              </Button>
            </div>
            </div>

            <aside className="rounded-xl bg-white p-5 lg:min-h-0 lg:overflow-y-auto">
              <div className="mb-4 flex items-center justify-center gap-2">
                {PLATFORMS.filter((platform) => occurrences[0]?.platforms.includes(platform.id)).map((platform) => { const Icon = platform.icon; return <span key={platform.id} className={cn("rounded-full border p-2", platform.chip)}><Icon className="h-4 w-4" /></span>; })}
              </div>
              <div className="mx-auto max-w-[310px] overflow-hidden rounded-[28px] border-[7px] border-slate-900 bg-white shadow-xl">
                <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold">
                  <span>Simply in Balance</span>
                  <span>•••</span>
                </div>
                <div className="relative flex aspect-[9/16] items-center justify-center overflow-hidden bg-slate-950">
                  {localPreviewUrl && selectedVideo.mimeType.startsWith("video/") ? (
                    <video src={localPreviewUrl} controls playsInline preload="metadata" className="h-full w-full object-contain" aria-label={`Voorbeeld van ${selectedVideo.name}`} />
                  ) : localPreviewUrl && selectedVideo.mimeType.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={localPreviewUrl} alt="Voorbeeld" className="h-full w-full object-cover" />
                  ) : selectedVideo.mimeType.startsWith("video/") && !selectedVideo.id.startsWith("manual-") && !selectedVideo.id.startsWith("desktop-") ? (
                    <iframe
                      src={`https://drive.google.com/file/d/${encodeURIComponent(selectedVideo.id)}/preview`}
                      title={`Voorbeeld van ${selectedVideo.name}`}
                      allow="autoplay; fullscreen"
                      className="h-full w-full border-0"
                    />
                  ) : selectedVideo.thumbnailLink ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedVideo.thumbnailLink} alt="Voorbeeld" className="h-full w-full object-cover" />
                  ) : selectedVideo.mimeType.startsWith("image/") ? (
                    <ImageIcon className="h-10 w-10 text-white/70" />
                  ) : (
                    <div className="px-6 text-center text-white/70">
                      <Film className="mx-auto h-10 w-10" />
                      <p className="mt-3 text-xs">Kies de video opnieuw om hem af te spelen.</p>
                    </div>
                  )}
                  <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white">{occurrences[0]?.format === "post" ? "POST" : "REEL"}</span>
                  {selectedVideo.mediaUrls && selectedVideo.mediaUrls.length > 1 ? <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white">1/{selectedVideo.mediaUrls.length}</span> : null}
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex gap-3 text-sm"><span>♡</span><span>◯</span><span>⌁</span></div>
                  <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-slate-700">{occurrences[0]?.caption || "Je caption verschijnt hier zodra je begint te schrijven."}</p>
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">De uiteindelijke weergave kan licht verschillen op Instagram en Facebook.</p>
            </aside>
          </div>
        ) : null}

        {phase === "details" ? (
          <DialogFooter className="border-t border-border bg-white px-6 py-4">
            <div>
              {initialDraft ? (
                <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Post verwijderen
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuleren
              </Button>
              <div className="flex min-w-48 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-medium text-slate-700">
                <CalendarDays className="h-4 w-4" />
                {occurrences[0]?.scheduledAt
                  ? new Date(occurrences[0].scheduledAt).toLocaleString("nl-BE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "Kies datum en tijd"}
              </div>
              {instagramConnected || facebookConnected || tiktokConnected ? <Button type="button" variant="outline" disabled={publishing} onClick={() => void publishNow()}>{publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Nu publiceren</Button> : <Button asChild type="button" variant="outline"><a href="/api/integrations/instagram/connect">Instagram koppelen</a></Button>}
              <Button type="button" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                {initialDraft ? "Wijzigingen opslaan" : "Inplannen"}
              </Button>
            </div>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
