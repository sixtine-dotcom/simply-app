import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; moduleId: string; lessonId: string; attachmentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { lessonId, attachmentId } = await params;

    const attachment = await db.lessonAttachment.findFirst({
      where: { id: attachmentId, lessonId },
    });
    if (!attachment) {
      return NextResponse.json({ error: "Bijlage niet gevonden" }, { status: 404 });
    }

    await db.lessonAttachment.delete({
      where: { id: attachmentId },
    });

    await createAuditLog("lesson.attachment.removed", user.id, {
      lessonId,
      attachmentId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete attachment error:", error);
    return NextResponse.json(
      { error: "Kon bijlage niet verwijderen" },
      { status: 500 }
    );
  }
}
