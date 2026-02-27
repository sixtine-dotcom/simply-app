import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Daily.co webhook: recording.ready-to-download
 * Room name for group = "group-recur-{courseId}-{isoDateTime}"
 * We save to CoachingRecording so the course page can list opnames.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const type = body?.type ?? body?.payload?.type;

    if (type !== "recording.ready-to-download") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const payload = body?.payload ?? body;
    const roomName = payload?.room_name;
    const recordingId = payload?.recording_id;
    const duration = payload?.duration ?? null;
    const startTs = payload?.start_ts ?? null;

    if (!roomName || !recordingId) {
      return NextResponse.json(
        { error: "Missing room_name or recording_id" },
        { status: 400 }
      );
    }

    // Alleen groepssessies opslaan (room name = group-recur-{courseId}-...)
    if (!roomName.startsWith("group-recur-")) {
      return NextResponse.json({ ok: true, skipped: "not-group" });
    }

    const parts = roomName.split("-");
    if (parts.length < 4) {
      return NextResponse.json({ ok: true, skipped: "invalid-format" });
    }

    // "group-recur-{courseId}-2025-02-03T19:30" -> courseId is parts[2] (cuid heeft geen streepjes)
    const courseId = parts[2];
    const recurrenceOccurrenceKey = "recur-" + parts.slice(2).join("-");

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });

    if (!course) {
      return NextResponse.json({ ok: true, skipped: "course-not-found" });
    }

    const scheduledAt = startTs ? new Date(startTs * 1000) : null;

    await db.coachingRecording.upsert({
      where: { dailyRecordingId: recordingId },
      create: {
        courseId,
        recurrenceOccurrenceKey,
        dailyRecordingId: recordingId,
        title: `Coaching ${scheduledAt ? scheduledAt.toLocaleDateString("nl-NL") : ""}`.trim(),
        scheduledAt,
        durationSecs: duration ?? null,
      },
      update: {
        durationSecs: duration ?? undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Daily webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
