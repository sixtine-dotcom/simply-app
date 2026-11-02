import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { IMAGE_TYPES, AUDIO_TYPES, validateUpload, isBlobConfigured } from "@/lib/upload-config";

const ALLOWED_EXTS = [
  ".jpg", ".jpeg", ".png", ".webp", ".gif",
  ".mp3", ".m4a", ".ogg", ".webm",
  ".pdf", ".doc", ".docx",
];

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Geen bestand of ongeldig veld (gebruik 'file')" },
        { status: 400 }
      );
    }

    const validationError = validateUpload(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const isImage = IMAGE_TYPES.includes(file.type);
    const isAudio = AUDIO_TYPES.includes(file.type);
    const ext = path.extname(file.name).toLowerCase();
    const safeExt = ALLOWED_EXTS.includes(ext)
      ? ext
      : isImage ? ".jpg" : isAudio ? ".mp3" : ".pdf";
    const filename = `${Date.now()}-${randomUUID()}${safeExt}`;

    // Production (Vercel): the server disk is read-only, so store in Vercel Blob.
    if (isBlobConfigured()) {
      const blob = await put(`uploads/${filename}`, file, {
        access: "public",
        contentType: file.type,
      });
      return NextResponse.json({ url: blob.url, name: file.name });
    }

    if (process.env.VERCEL) {
      console.error("Upload error: BLOB_READ_WRITE_TOKEN is not set on Vercel");
      return NextResponse.json(
        {
          error:
            "Uploaden is nog niet ingesteld: koppel Vercel Blob opslag aan dit project (BLOB_READ_WRITE_TOKEN ontbreekt).",
        },
        { status: 500 }
      );
    }

    // Local development: save under public/uploads.
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const bytes = await file.arrayBuffer();
    await writeFile(path.join(dir, filename), Buffer.from(bytes));

    return NextResponse.json({ url: `/uploads/${filename}`, name: file.name });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload mislukt" },
      { status: 500 }
    );
  }
}
