import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/auth";
import { ALLOWED_TYPES, MAX_SIZE_FILE, isBlobConfigured } from "@/lib/upload-config";

// Issues a short-lived token so the browser uploads straight to Vercel Blob.
// This avoids Vercel's 4.5 MB request-body limit on serverless functions.
export async function POST(request: NextRequest) {
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: "blob_not_configured" },
      { status: 501 }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as HandleUploadBody;
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_TYPES,
        // Per-type limits are checked in the browser; this is the hard cap.
        maximumSizeInBytes: MAX_SIZE_FILE,
        addRandomSuffix: true,
      }),
    });
    return NextResponse.json(json);
  } catch (error) {
    console.error("Blob upload token error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload mislukt" },
      { status: 400 }
    );
  }
}
