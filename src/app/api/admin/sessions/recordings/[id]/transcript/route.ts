import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN" && user.role !== "COACH")) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const { id } = await params;
  const recording = await db.coachingRecording.findUnique({
    where: { id },
    include: {
      course: { select: { coachId: true } },
      session: { select: { coachId: true } },
    },
  });

  if (!recording) {
    return NextResponse.json({ error: "Opname niet gevonden" }, { status: 404 });
  }

  const canAccess =
    user.role === "ADMIN" ||
    user.role === "SUPERADMIN" ||
    recording.coachId === user.id ||
    recording.course?.coachId === user.id ||
    recording.session?.coachId === user.id;
  if (!canAccess) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  return new NextResponse(recording.transcript || "", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="transcript-${recording.id}.txt"`,
    },
  });
}
