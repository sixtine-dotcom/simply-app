import { z } from "zod";

// Only public HTTPS media may be fetched by the publisher.
export const publicMediaUrl = z.string().url().refine((value) => {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  return url.protocol === "https:" && !url.username && !url.password &&
    !host.includes(":") && !/^\d+\./.test(host) && host.includes(".") &&
    !host.endsWith(".local") && !host.endsWith(".localhost") && !host.endsWith(".internal");
}, "Gebruik een publiek bereikbare HTTPS-media-URL");
export const platformsInput = z.array(z.enum(["instagram", "facebook", "tiktok"])).min(1).max(3).transform((v) => Array.from(new Set(v)));
export const mediaInput = z.array(z.object({ url: publicMediaUrl, type: z.enum(["image", "video"]) })).min(1).max(10);
export const socialInput = z.object({
  media: mediaInput, platforms: platformsInput, caption: z.string().max(2200).default(""),
  tiktokCaption: z.string().max(2200).optional(), format: z.enum(["reel", "post", "story"]).default("reel"),
}).refine((v) => !v.platforms.includes("tiktok") || (v.media.length === 1 && v.media[0].type === "video"), "Kies voor TikTok precies één video");

export const scheduleInput = z.object({
  video: z.object({ id: z.string().min(1).max(250), name: z.string().max(500), mimeType: z.string(), modifiedTime: z.string(), mediaUrls: z.array(publicMediaUrl).min(1).max(10) }).passthrough(),
  categoryId: z.string().max(250), savedAt: z.string(),
  publications: z.array(z.object({
    id: z.string().min(1).max(250), scheduledAt: z.string().datetime({ offset: true }),
    platforms: platformsInput, caption: z.string().max(2200), tiktokCaption: z.string().max(2200).optional(),
    format: z.enum(["reel", "post"]).default("reel"),
  })).min(1).max(100),
}).refine((v) => new Set(v.publications.map((p) => p.id)).size === v.publications.length, "Publicatiemomenten moeten uniek zijn")
.refine((v) => !v.publications.some((p) => p.platforms.includes("tiktok")) || (v.video.mimeType.startsWith("video/") && v.video.mediaUrls.length === 1), "Kies voor TikTok precies één video");
