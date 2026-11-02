"use client";

import { upload } from "@vercel/blob/client";
import { validateUpload } from "@/lib/upload-config";

export interface UploadedFile {
  url: string;
  name: string;
}

let blobUnavailable = false;

/**
 * Uploads a file from the browser.
 * Tries a direct upload to Vercel Blob first (no 4.5 MB server limit),
 * and falls back to the regular /api/upload route (local development).
 */
export async function uploadFile(file: File): Promise<UploadedFile> {
  const validationError = validateUpload(file);
  if (validationError) throw new Error(`${file.name}: ${validationError}`);

  if (!blobUnavailable) {
    try {
      const blob = await upload(`uploads/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload/blob",
        contentType: file.type,
      });
      return { url: blob.url, name: file.name };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      // The token route refused (e.g. Blob not configured locally): use the
      // regular upload route, which also returns a readable error message.
      if (!message.includes("retrieve the client token")) {
        throw new Error(`${file.name}: ${message || "Upload mislukt"}`);
      }
      blobUnavailable = true;
    }
  }

  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 413) {
      throw new Error(`${file.name}: bestand te groot voor de server`);
    }
    throw new Error(`${file.name}: ${data.error || "Upload mislukt"}`);
  }
  return { url: data.url, name: data.name ?? file.name };
}
