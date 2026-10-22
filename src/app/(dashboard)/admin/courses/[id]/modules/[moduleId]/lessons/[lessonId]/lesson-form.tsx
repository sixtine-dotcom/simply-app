"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare2,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  List,
  Loader2,
  MonitorPlay,
  Plus,
  RotateCcw,
  RotateCw,
  Trash2,
  Type,
  Underline,
  Video,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { VideoPlayer } from "@/components/courses/video-player";
import { EmbeddedVideo } from "@/components/courses/embedded-video";
import { VideoLibraryPicker } from "@/components/video-studio/video-library-picker";

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  extraContent?: string | null;
  checklistTitle?: string | null;
  checklistItems?: unknown;
  videoUrl: string | null;
  videoEmbedCode?: string | null;
  videoProvider: string | null;
  videoDuration?: number | null;
  unlockAfterDays: number | null;
}

interface LessonEditFormProps {
  courseId: string;
  moduleId: string;
  lessonId: string;
  initialLesson: Lesson;
}

export function LessonEditForm({
  courseId,
  moduleId,
  lessonId,
  initialLesson,
}: LessonEditFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initialLesson.title);
  const [content, setContent] = useState(initialLesson.content ?? "");
  const [extraContent, setExtraContent] = useState(initialLesson.extraContent ?? "");
  const [checklistTitle, setChecklistTitle] = useState(initialLesson.checklistTitle ?? "");
  const [checklistItems, setChecklistItems] = useState(formatChecklistItems(initialLesson.checklistItems));
  const [videoUrl, setVideoUrl] = useState(initialLesson.videoUrl ?? "");
  const [videoEmbedCode, setVideoEmbedCode] = useState(initialLesson.videoEmbedCode ?? "");
  const [videoDurationMinutes, setVideoDurationMinutes] = useState(
    initialLesson.videoDuration ? String(Math.max(1, Math.round(initialLesson.videoDuration / 60))) : ""
  );
  const [unlockAfterDays, setUnlockAfterDays] = useState(
    initialLesson.unlockAfterDays ?? ""
  );
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const hasHydratedRef = useRef(false);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const lastSavedRef = useRef(
    JSON.stringify({
      title: initialLesson.title.trim(),
      content: (initialLesson.content ?? "").trim(),
      extraContent: (initialLesson.extraContent ?? "").trim(),
      checklistTitle: (initialLesson.checklistTitle ?? "").trim(),
      checklistItems: normalizeChecklistItems(formatChecklistItems(initialLesson.checklistItems)),
      videoUrl: initialLesson.videoUrl ?? "",
      videoEmbedCode: initialLesson.videoEmbedCode ?? "",
      videoDurationMinutes: initialLesson.videoDuration
        ? Math.max(1, Math.round(initialLesson.videoDuration / 60))
        : "",
      unlockAfterDays: initialLesson.unlockAfterDays ?? "",
    })
  );

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialLesson.content ?? "";
    }
  }, [initialLesson.content]);

  useEffect(() => {
    if (!videoUrl || videoEmbedCode.trim() || !isDirectVideoUrl(videoUrl)) {
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = videoUrl;
    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setVideoDurationMinutes(String(Math.max(1, Math.round(video.duration / 60))));
      }
    };
  }, [videoUrl, videoEmbedCode]);

  useEffect(() => {
    hasHydratedRef.current = true;
    return () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  const syncEditorContent = () => {
    setContent(editorRef.current?.innerHTML ?? "");
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const runCommand = (command: string, value?: string) => {
    focusEditor();
    document.execCommand(command, false, value);
    syncEditorContent();
  };

  const applyBlock = (tag: "p" | "h1" | "h2") => {
    focusEditor();
    document.execCommand("formatBlock", false, tag);
    syncEditorContent();
  };

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload mislukt");
      }

      focusEditor();
      document.execCommand("insertImage", false, data.url);
      syncEditorContent();
      toast({ title: "Afbeelding toegevoegd" });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon afbeelding niet uploaden",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleMediaUpload = async (file: File | undefined) => {
    if (!file) return;

    setIsUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload mislukt");
      }

      setVideoUrl(data.url);
      setVideoEmbedCode("");
      toast({ title: "Media toegevoegd" });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon media niet uploaden",
        variant: "destructive",
      });
    } finally {
      setIsUploadingMedia(false);
      if (mediaInputRef.current) {
        mediaInputRef.current.value = "";
      }
    }
  };

  const saveLesson = async (showToast = false) => {
    const normalizedChecklistItems = normalizeChecklistItems(checklistItems);
    const payload = {
      title: title.trim(),
      content: content.trim() || null,
      extraContent: extraContent.trim() || null,
      checklistTitle: normalizedChecklistItems.length > 0 ? checklistTitle.trim() || "Opdrachten" : null,
      checklistItems: normalizedChecklistItems.length > 0 ? normalizedChecklistItems : null,
      videoUrl: videoUrl.trim() || null,
      videoEmbedCode: videoEmbedCode.trim() || null,
      videoDuration:
        videoDurationMinutes === ""
          ? null
          : Math.max(1, Number(videoDurationMinutes)) * 60,
      videoProvider: videoUrl.includes("loom.com")
        ? "loom"
        : videoUrl.includes("vimeo.com")
          ? "vimeo"
          : videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")
            ? "youtube"
            : null,
      unlockAfterDays: unlockAfterDays === "" ? null : Number(unlockAfterDays),
    };

    setIsLoading(true);
    setSaveState("saving");
    try {
      const res = await fetch(
        `/api/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Opslaan mislukt");
      lastSavedRef.current = JSON.stringify({
        title: payload.title,
        content: payload.content ?? "",
        extraContent: payload.extraContent ?? "",
        checklistTitle: payload.checklistTitle ?? "",
        checklistItems: payload.checklistItems ?? [],
        videoUrl: payload.videoUrl ?? "",
        videoEmbedCode: payload.videoEmbedCode ?? "",
        videoDurationMinutes:
          payload.videoDuration === null ? "" : Math.max(1, Math.round(payload.videoDuration / 60)),
        unlockAfterDays: unlockAfterDays === "" ? "" : Number(unlockAfterDays),
      });
      setSaveState("saved");
      if (showToast) {
        toast({ title: "Lesson saved" });
      }
      router.refresh();
    } catch {
      setSaveState("error");
      toast({
        title: "Error",
        description: "Could not save this lesson",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveLesson(true);
  };

  useEffect(() => {
    if (!hasHydratedRef.current) {
      return;
    }

    const currentSnapshot = JSON.stringify({
      title: title.trim(),
      content: content.trim(),
      extraContent: extraContent.trim(),
      checklistTitle: checklistTitle.trim(),
      checklistItems: normalizeChecklistItems(checklistItems),
      videoUrl: videoUrl.trim(),
      videoEmbedCode: videoEmbedCode.trim(),
      videoDurationMinutes,
      unlockAfterDays,
    });

    if (!title.trim()) {
      setSaveState("unsaved");
      return;
    }

    if (currentSnapshot === lastSavedRef.current) {
      if (saveState !== "saved") {
        setSaveState("saved");
      }
      return;
    }

    setSaveState("unsaved");

    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = window.setTimeout(() => {
      void saveLesson(false);
    }, 900);
  }, [title, content, extraContent, checklistTitle, checklistItems, videoUrl, videoEmbedCode, videoDurationMinutes, unlockAfterDays]);

  const updateChecklistItem = (index: number, value: string) => {
    setChecklistItems((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const addChecklistItem = () => {
    setChecklistItems((current) => [...current, ""]);
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems((current) => current.filter((_item, itemIndex) => itemIndex !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => handleImageUpload(event.target.files?.[0])}
      />
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(event) => handleMediaUpload(event.target.files?.[0])}
      />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Label htmlFor="title">Titel les</Label>
          <div className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
            {saveState === "saving" ? "Saving automatically..." : null}
            {saveState === "saved" ? "All changes saved" : null}
            {saveState === "unsaved" ? "Unsaved changes..." : null}
            {saveState === "error" ? "Save failed" : null}
          </div>
        </div>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Bijv. Introductie"
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-4 rounded-[1.8rem] border border-border bg-muted/10 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Video, GIF of visual</p>
            <p className="text-xs text-muted-foreground">
              Voeg een lesvideo toe, of gebruik een GIF/afbeelding/korte video als speels media-blok wanneer deze les geen video nodig heeft.
            </p>
          </div>
          <Button type="button" variant="outline" asChild className="shrink-0">
            <Link href={`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/preview`} target="_blank">
              <MonitorPlay className="mr-2 h-4 w-4" />
              Open lesson preview
            </Link>
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="videoUrl" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Video/GIF URL
          </Label>
          <Input
            id="videoUrl"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.loom.com/share/... of /uploads/grappige-gif.gif"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Loom, Vimeo en YouTube worden embedded. Directe GIF-, afbeeldings- en MP4-links worden in ditzelfde media-blok getoond.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => mediaInputRef.current?.click()}
            disabled={isLoading || isUploadingMedia}
          >
            {isUploadingMedia ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-2 h-4 w-4" />
            )}
            Upload GIF/video
          </Button>
          <VideoLibraryPicker
            disabled={isLoading}
            onSelect={(video) => {
              setVideoUrl(video.finalUrl);
              setVideoEmbedCode("");
              if (video.finalDurationSec) {
                setVideoDurationMinutes(String(Math.max(1, Math.round(video.finalDurationSec / 60))));
              }
            }}
          />
          {videoUrl ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setVideoUrl("");
                setVideoEmbedCode("");
              }}
              disabled={isLoading}
            >
              Media verwijderen
            </Button>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="videoEmbedCode">Embed code (optioneel)</Label>
          <textarea
            id="videoEmbedCode"
            value={videoEmbedCode}
            onChange={(e) => setVideoEmbedCode(e.target.value)}
            placeholder="<iframe ...></iframe>"
            className="w-full min-h-[120px] rounded-xl border border-border bg-background px-3 py-3 text-sm"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Gebruik dit voor Vimeo embeds, externe players of tools zoals Wistia. Als hier code staat, krijgt die voorrang op de gewone video-URL.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="videoDurationMinutes">Duur lesmateriaal (minuten)</Label>
          <Input
            id="videoDurationMinutes"
            type="number"
            min={1}
            value={videoDurationMinutes}
            onChange={(event) => setVideoDurationMinutes(event.target.value)}
            placeholder="Wordt automatisch ingevuld bij geuploade video"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Bij directe video-uploads wordt dit automatisch berekend. Voor Vimeo, YouTube of Loom kun je het aantal minuten hier invullen.
          </p>
        </div>

        <div className="space-y-3 rounded-[1.6rem] border border-border bg-background p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Media preview</p>
            <p className="text-xs text-muted-foreground">
              Zo ziet dit onderdeel er voor de klant uit.
            </p>
          </div>
          {videoEmbedCode.trim() ? (
            <EmbeddedVideo embedCode={videoEmbedCode} />
          ) : videoUrl.trim() ? (
            <VideoPlayer
              url={videoUrl}
              provider={
                videoUrl.includes("loom.com")
                  ? "loom"
                  : videoUrl.includes("vimeo.com")
                    ? "vimeo"
                    : videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")
                      ? "youtube"
                      : null
              }
            />
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-2xl bg-stone-950 text-stone-200">
              <p className="text-sm text-stone-300">Nog geen video, GIF of visual toegevoegd</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Lesinhoud boven de video</Label>
        <div className="overflow-hidden rounded-[1.6rem] border border-border bg-background shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 p-3">
            <select
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
              defaultValue="Inter"
              onChange={(event) => runCommand("fontName", event.target.value)}
              disabled={isLoading}
            >
              <option value="Inter">Sans</option>
              <option value="Georgia">Serif</option>
              <option value="The Seasons">Display</option>
              <option value="Courier New">Mono</option>
            </select>

            <Button type="button" size="sm" variant="outline" onClick={() => applyBlock("h1")} disabled={isLoading}>
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyBlock("h2")} disabled={isLoading}>
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyBlock("p")} disabled={isLoading}>
              <Type className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => runCommand("bold")} disabled={isLoading}>
              <Bold className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => runCommand("italic")} disabled={isLoading}>
              <Italic className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => runCommand("underline")} disabled={isLoading}>
              <Underline className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => runCommand("insertUnorderedList")} disabled={isLoading}>
              <List className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => runCommand("justifyLeft")} disabled={isLoading}>
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => runCommand("justifyCenter")} disabled={isLoading}>
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => runCommand("justifyRight")} disabled={isLoading}>
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => runCommand("undo")} disabled={isLoading}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => runCommand("redo")} disabled={isLoading}>
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploadingImage}
            >
              {isUploadingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div
            id="content"
            ref={editorRef}
            contentEditable={!isLoading}
            suppressContentEditableWarning
            onInput={syncEditorContent}
            className="min-h-[320px] px-4 py-4 text-sm leading-7 focus:outline-none [&_h1]:my-4 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:tracking-tight [&_h1]:text-slate-950 [&_h2]:my-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:tracking-tight [&_h2]:text-slate-950 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_img]:my-5 [&_img]:max-h-[420px] [&_img]:w-auto [&_img]:max-w-full [&_img]:rounded-2xl"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Dit blok verschijnt op de lespagina boven de video.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="extraContent">Extra tekst onder de video</Label>
        <textarea
          id="extraContent"
          value={extraContent}
          onChange={(event) => setExtraContent(event.target.value)}
          placeholder="Voeg hier optionele tekst toe die onder de video verschijnt."
          className="min-h-[180px] w-full rounded-[1.4rem] border border-border bg-background px-4 py-3 text-sm leading-7 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Je kunt gewone tekst of eenvoudige HTML gebruiken. Laat leeg als er niets onder de video hoeft te staan.
        </p>
      </div>

      <div className="space-y-3 rounded-[1.8rem] border border-border bg-muted/10 p-5">
        <div>
          <Label htmlFor="checklistTitle">Opdrachtenlijst titel</Label>
          <Input
            id="checklistTitle"
            value={checklistTitle}
            onChange={(event) => setChecklistTitle(event.target.value)}
            placeholder="Bijv. 30 planten challenge"
            disabled={isLoading}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="checklistItems">Opdrachten die klanten kunnen afvinken</Label>
          <div id="checklistItems" className="mt-2 space-y-2">
            {checklistItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2 rounded-2xl border border-border bg-background p-2">
                <CheckSquare2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                <Input
                  value={item}
                  onChange={(event) => updateChecklistItem(index, event.target.value)}
                  placeholder={`Opdracht ${index + 1}`}
                  disabled={isLoading}
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeChecklistItem(index)}
                  disabled={isLoading}
                  aria-label="Opdracht verwijderen"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addChecklistItem} disabled={isLoading}>
              <Plus className="mr-2 h-4 w-4" />
              Opdracht toevoegen
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Net als een checklist: maak losse opdrachten die klanten in hun les kunnen afvinken. Laat alles leeg als deze les geen afvinklijst nodig heeft.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="unlockAfterDays">Beschikbaar na X dagen (optioneel)</Label>
        <Input
          id="unlockAfterDays"
          type="number"
          min={0}
          value={unlockAfterDays}
          onChange={(e) => setUnlockAfterDays(e.target.value)}
          placeholder="Leeg = direct zichtbaar"
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Laat leeg als de les direct beschikbaar is. Vul een aantal dagen in als je voor deze les een manuele dripping-override wilt.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save now"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Deze les wordt automatisch opgeslagen terwijl je werkt. Met de pijltjes kun je recente acties ongedaan maken of opnieuw uitvoeren.
        </p>
      </div>
    </form>
  );
}

function normalizeChecklistItems(value: string[]) {
  return value.map((item) => item.trim()).filter(Boolean);
}

function formatChecklistItems(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return [];
}

function isDirectVideoUrl(value: string) {
  try {
    const pathname = new URL(value, window.location.origin).pathname.toLowerCase();
    return /\.(mp4|webm|mov|m4v)$/.test(pathname);
  } catch {
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(value);
  }
}
