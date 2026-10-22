import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export * from "./video-studio-shared";

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** The local pipeline authenticates with a shared secret (VIDEO_PIPELINE_TOKEN). */
export function requirePipelineToken(req: NextRequest): NextResponse | null {
  const expected = process.env.VIDEO_PIPELINE_TOKEN?.trim();
  if (!expected) {
    return NextResponse.json({ error: "VIDEO_PIPELINE_TOKEN is niet ingesteld" }, { status: 503 });
  }
  const header = req.headers.get("authorization") || "";
  const given = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }
  return null;
}

export async function requireVideoAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) return null;
  return user;
}

/** Admins only see their own tenant's projects (the pipeline tags them via VIDEO_PIPELINE_TENANT_ID). */
export function videoProjectScope(tenantId: string | null | undefined) {
  return { tenantId: tenantId ?? null };
}

/** Everything the review page needs, without the large full-recording transcript and waveform. */
export const REVIEW_PROJECT_SELECT = Prisma.validator<Prisma.VideoProjectSelect>()({
  id: true,
  slug: true,
  title: true,
  mode: true,
  briefing: true,
  cutByVisuals: true,
  colorMatch: true,
  status: true,
  steps: true,
  errorMessage: true,
  approvedAt: true,
  finalUrl: true,
  finalVersion: true,
  finalDurationSec: true,
  sourceProxyUrl: true,
  sourceDurationSec: true,
  manualEdit: true,
  caption: true,
  captionRequestedAt: true,
  captionGeneratedAt: true,
  scheduledAt: true,
  publishStatus: true,
  publishError: true,
  thumbnailSec: true,
  publishedAt: true,
  publishHistory: true,
  versions: { orderBy: { number: "desc" } },
  comments: { orderBy: [{ startSec: "asc" }, { createdAt: "asc" }] },
});

export async function findVideoProjectForAdmin(id: string, tenantId: string | null | undefined) {
  return db.videoProject.findFirst({ where: { id, ...videoProjectScope(tenantId) } });
}
