// Shared upload rules, used by both the server routes and the browser helper.

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
  "audio/x-m4a",
];
export const FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export const ALLOWED_TYPES = [...IMAGE_TYPES, ...AUDIO_TYPES, ...FILE_TYPES];

export const MAX_SIZE_IMAGE = 10 * 1024 * 1024; // 10MB
export const MAX_SIZE_AUDIO = 16 * 1024 * 1024; // 16MB voice
export const MAX_SIZE_FILE = 25 * 1024 * 1024; // 25MB for PDF/docs

export function maxSizeFor(type: string) {
  if (IMAGE_TYPES.includes(type)) return MAX_SIZE_IMAGE;
  if (AUDIO_TYPES.includes(type)) return MAX_SIZE_AUDIO;
  return MAX_SIZE_FILE;
}

export function validateUpload(file: { type: string; size: number }): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Toegestaan: afbeeldingen (JPEG, PNG, WebP, GIF), audio (MP3, M4A, OGG, WebM), PDF of Word";
  }
  if (file.size > maxSizeFor(file.type)) {
    if (IMAGE_TYPES.includes(file.type)) return "Afbeelding te groot (max 10 MB)";
    if (AUDIO_TYPES.includes(file.type)) return "Audio te groot (max 16 MB)";
    return "Bestand te groot (max 25 MB)";
  }
  return null;
}

/** Vercel Blob is used whenever its token is configured (required on Vercel). */
export function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
