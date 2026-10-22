import { Facebook, Instagram, Music2 } from "lucide-react";

export type DriveVideo = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  mediaUrls?: string[];
  source?: "drive" | "desktop" | "canva";
};

export type ContentPublication = {
  id: string;
  scheduledAt: string;
  platforms: string[];
  caption: string;
  // Optional TikTok-specific caption; falls back to `caption` when empty.
  tiktokCaption?: string;
  format?: "reel" | "post";
};

export type ContentDraft = {
  video: DriveVideo;
  categoryId: string;
  publications: ContentPublication[];
  savedAt: string;
};

export const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram, chip: "border-rose-200 bg-rose-50 text-rose-600" },
  { id: "facebook", label: "Facebook", icon: Facebook, chip: "border-sky-200 bg-sky-50 text-sky-600" },
  { id: "tiktok", label: "TikTok", icon: Music2, chip: "border-slate-300 bg-slate-50 text-slate-900" },
] as const;

export function platformMeta(id: string) {
  return PLATFORMS.find((platform) => platform.id === id) ?? PLATFORMS[0];
}

export function draftKey(fileId: string) {
  return `simply-content-draft:${fileId}`;
}

export function formatSize(value?: string) {
  if (!value) return "";
  const mb = Number(value) / 1024 / 1024;
  return mb >= 1000 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
}

export function displayMediaName(name: string) {
  return name.replace(/\.(mp4|mov|m4v|webm|jpg|jpeg|png|webp|gif)$/i, "");
}

export function saveDraftToStorage(draft: ContentDraft) {
  window.localStorage.setItem(draftKey(draft.video.id), JSON.stringify(draft));
}

export function deleteDraftFromStorage(fileId: string) {
  window.localStorage.removeItem(draftKey(fileId));
}

// Reads every saved draft from this browser. Tolerates the pre-redesign draft
// shape (single scheduledAt/platforms/caption, no categoryId) by folding it
// into a one-item publications list under the first known category.
export function loadDraftsFromStorage(fallbackCategoryId: string): ContentDraft[] {
  const drafts: ContentDraft[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith("simply-content-draft:")) continue;
    try {
      const raw = JSON.parse(window.localStorage.getItem(key) || "");
      if (!raw?.video?.id) continue;
      const publications: ContentPublication[] = Array.isArray(raw.publications) && raw.publications.length
        ? raw.publications
        : raw.scheduledAt
          ? [{ id: `legacy-${raw.video.id}`, scheduledAt: raw.scheduledAt, platforms: raw.platforms?.length ? raw.platforms : ["instagram"], caption: raw.caption || "" }]
          : [];
      drafts.push({
        video: raw.video,
        categoryId: raw.categoryId || fallbackCategoryId,
        publications,
        savedAt: raw.savedAt || new Date().toISOString(),
      });
    } catch {
      // Ignore damaged browser drafts.
    }
  }
  return drafts;
}
