import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/calendar-sync";
import { createR2UploadUrl, uploadToR2 } from "@/lib/r2";
export const maxDuration = 300;
const input = z.union([
  z.object({ driveId: z.string().regex(/^[a-zA-Z0-9_-]+$/) }),
  z.object({ name: z.string().max(500), type: z.enum(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "image/jpeg", "image/png", "image/webp", "image/gif"]), size: z.number().positive().max(250 * 1024 * 1024) }),
]);
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "SUPERADMIN"].includes(user.role)) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kies een foto of video van maximaal 250 MB" }, { status: 400 });
  try {
    if ("driveId" in parsed.data) {
      const connection = await db.calendarConnection.findFirst({ where: { userId: user.id, provider: "google", syncEnabled: true } });
      if (!connection) throw new Error("Koppel Google Drive opnieuw");
      const token = await getValidAccessToken(connection);
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${parsed.data.driveId}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Drive-video ophalen mislukt");
      if (Number(response.headers.get("content-length")) > 250 * 1024 * 1024) throw new Error("Video is groter dan 250 MB");
      const type = response.headers.get("content-type") || "video/mp4";
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!type.startsWith("video/") || bytes.length > 250 * 1024 * 1024) throw new Error("Kies een video van maximaal 250 MB");
      return NextResponse.json(await uploadToR2({ key: `content/${user.id}/${randomUUID()}.mp4`, body: bytes, contentType: type }));
    }
    const ext = parsed.data.name.split(".").pop()?.toLowerCase();
    const suffix = ext && /^[a-z0-9]{2,5}$/.test(ext) ? ext : "bin";
    return NextResponse.json(await createR2UploadUrl({ key: `content/${user.id}/${randomUUID()}.${suffix}`, contentType: parsed.data.type }));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Upload mislukt" }, { status: 502 }); }
}
