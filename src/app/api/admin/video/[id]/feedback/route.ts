import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findVideoProjectForAdmin, requireVideoAdmin } from "@/lib/video-studio";

// Hands all open comments to the Mac pipeline, which renders the next version.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireVideoAdmin();
  if (!user) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  const { id } = await params;
  if (!(await findVideoProjectForAdmin(id, user.tenantId))) {
    return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });
  }

  const queued = await db.$transaction(async (tx) => {
    const { count } = await tx.videoComment.updateMany({
      where: { projectId: id, status: "OPEN" },
      data: { status: "QUEUED" },
    });
    if (count > 0) {
      await tx.videoProject.update({
        where: { id },
        data: { status: "APPLYING_FEEDBACK", feedbackRequestedAt: new Date() },
      });
    }
    return count;
  });

  if (queued === 0) {
    return NextResponse.json({ error: "Er zijn geen open opmerkingen om te verwerken" }, { status: 400 });
  }
  return NextResponse.json({ queued });
}
