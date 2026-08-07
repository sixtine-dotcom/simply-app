import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSession } from "@/lib/coaching";
import { startRecording } from "@/lib/daily";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const session = await getSession(id, user.id, user.tenantId);
    if (!session) {
      return NextResponse.json({ error: "Sessie niet gevonden" }, { status: 404 });
    }

    const isOwner = session.coach.id === user.id || user.role === "ADMIN" || user.role === "SUPERADMIN";
    if (!isOwner) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const roomName = session.recurrenceOccurrenceKey
      ? `group-${session.recurrenceOccurrenceKey}`
      : `session-${session.id}`;

    await startRecording(roomName);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Manual recording start error:", error);
    return NextResponse.json({ error: "Kon opname niet starten" }, { status: 500 });
  }
}
