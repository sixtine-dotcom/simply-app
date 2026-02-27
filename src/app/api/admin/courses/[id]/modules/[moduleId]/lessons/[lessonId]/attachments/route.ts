import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { db } from "@/lib/db";

const addAttachmentSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  url: z.string().url("Ongeldige URL"),
  type: z.enum(["pdf", "image", "file"]),
  size: z.number().int().min(0).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { lessonId } = await params;

    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });
    if (!lesson) {
      return NextResponse.json({ error: "Les niet gevonden" }, { status: 404 });
    }

    const body = await request.json();
    const data = addAttachmentSchema.parse(body);

    const attachment = await db.lessonAttachment.create({
      data: {
        lessonId,
        name: data.name,
        url: data.url,
        type: data.type,
        size: data.size ?? null,
      },
    });

    await createAuditLog("lesson.attachment.added", user.id, {
      lessonId,
      attachmentId: attachment.id,
    });

    return NextResponse.json(attachment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Add attachment error:", error);
    return NextResponse.json(
      { error: "Kon bijlage niet toevoegen" },
      { status: 500 }
    );
  }
}
