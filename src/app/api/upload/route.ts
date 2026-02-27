import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
  "audio/x-m4a",
];
const FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_TYPES = [...IMAGE_TYPES, ...AUDIO_TYPES, ...FILE_TYPES];
const MAX_SIZE_IMAGE = 10 * 1024 * 1024; // 10MB
const MAX_SIZE_AUDIO = 16 * 1024 * 1024; // 16MB voice
const MAX_SIZE_FILE = 25 * 1024 * 1024; // 25MB for PDF/docs

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

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Toegestaan: afbeeldingen (JPEG, PNG, WebP, GIF), audio (MP3, M4A, OGG, WebM), PDF of Word",
        },
        { status: 400 }
      );
    }
    const isImage = IMAGE_TYPES.includes(file.type);
    const isAudio = AUDIO_TYPES.includes(file.type);
    const maxSize = isImage
      ? MAX_SIZE_IMAGE
      : isAudio
        ? MAX_SIZE_AUDIO
        : MAX_SIZE_FILE;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: isImage
            ? "Afbeelding te groot (max 10 MB)"
            : isAudio
              ? "Audio te groot (max 16 MB)"
              : "Bestand te groot (max 25 MB)",
        },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name) || (isImage ? ".jpg" : isAudio ? ".mp3" : ".pdf");
    const allowedExts = [
      ".jpg", ".jpeg", ".png", ".webp", ".gif",
      ".mp3", ".m4a", ".ogg", ".webm",
      ".pdf", ".doc", ".docx",
    ];
    const safeExt = allowedExts.includes(ext.toLowerCase())
      ? ext.toLowerCase()
      : isImage ? ".jpg" : isAudio ? ".mp3" : ".pdf";
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const filename = `${Date.now()}-${randomUUID()}${safeExt}`;
    const filepath = path.join(dir, filename);
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    const url = `/uploads/${filename}`;
    return NextResponse.json({ url, name: file.name });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload mislukt" },
      { status: 500 }
    );
  }
}
