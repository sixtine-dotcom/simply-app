import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { getSession, addSessionNote } from "@/lib/coaching";

const createNoteSchema = z.object({
  content: z.string().min(1, "Notitie is verplicht"),
  isSharedWithClient: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const session = await getSession(id, user.id);

    if (!session) {
      return NextResponse.json(
        { error: "Sessie niet gevonden" },
        { status: 404 }
      );
    }

    // Only coach or admin can add notes
    if (session.coach.id !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Alleen de coach kan notities toevoegen" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = createNoteSchema.parse(body);

    const note = await addSessionNote(
      id,
      data.content,
      data.isSharedWithClient ?? false
    );

    await createAuditLog("session.note.created", user.id, {
      sessionId: id,
      noteId: note.id,
    });

    return NextResponse.json(note);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Create note error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
