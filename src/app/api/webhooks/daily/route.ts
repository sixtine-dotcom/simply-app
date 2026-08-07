import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { summarizeCoachingTranscript } from "@/lib/ai";
import { uploadCoachingRecordingToGoogleDrive } from "@/lib/google-drive";

async function readTranscript(payload: any) {
  if (typeof payload?.transcript === "string") {
    return payload.transcript;
  }

  const transcriptUrl =
    typeof payload?.transcript_url === "string"
      ? payload.transcript_url
      : typeof payload?.transcript_download_link === "string"
        ? payload.transcript_download_link
        : null;

  if (!transcriptUrl) return { text: null, sourceUrl: null };

  try {
    const response = await fetch(transcriptUrl);
    if (!response.ok) return { text: null, sourceUrl: transcriptUrl };
    return { text: await response.text(), sourceUrl: transcriptUrl };
  } catch (error) {
    console.error("Daily transcript fetch failed:", error);
    return { text: null, sourceUrl: transcriptUrl };
  }
}

function getGroupRecordingContext(roomName: string) {
  if (!roomName.startsWith("group-recur-")) return null;

  const parts = roomName.split("-");
  if (parts.length < 4) return null;

  const courseId = parts[2];
  const recurrenceOccurrenceKey = "recur-" + parts.slice(2).join("-");
  return { courseId, recurrenceOccurrenceKey };
}

function getSessionRecordingContext(roomName: string) {
  if (!roomName.startsWith("session-")) return null;
  const sessionId = roomName.slice("session-".length);
  return sessionId ? { sessionId } : null;
}

/**
 * Daily.co webhook: recording.ready-to-download
 * Room name for group = "group-recur-{courseId}-{isoDateTime}"
 * We save to CoachingRecording so the course page can list opnames.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const type = body?.type ?? body?.payload?.type;

    if (
      type !== "recording.ready-to-download" &&
      type !== "recording.transcript-ready" &&
      type !== "recording.transcript.ready"
    ) {
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

    const groupContext = getGroupRecordingContext(roomName);
    const sessionContext = getSessionRecordingContext(roomName);

    if (!groupContext && !sessionContext) {
      return NextResponse.json({ ok: true, skipped: "unknown-room" });
    }

    const session = sessionContext
      ? await db.coachingSession.findUnique({
          where: { id: sessionContext.sessionId },
          select: {
            id: true,
            coachId: true,
            title: true,
            scheduledAt: true,
            recurrenceOccurrenceKey: true,
          },
        })
      : null;

    const course = groupContext
      ? await db.course.findUnique({
          where: { id: groupContext.courseId },
          select: { id: true, title: true, coachId: true },
        })
      : null;

    if (groupContext && !course) {
      return NextResponse.json({ ok: true, skipped: "course-not-found" });
    }

    const scheduledAt = startTs ? new Date(startTs * 1000) : null;
    const transcriptResult = await readTranscript(payload);
    const transcript =
      typeof transcriptResult === "string" ? transcriptResult : transcriptResult.text;
    const transcriptSourceUrl =
      typeof transcriptResult === "string" ? null : transcriptResult.sourceUrl;
    const summary = transcript ? await summarizeCoachingTranscript(transcript) : null;

    const recording = await db.coachingRecording.upsert({
      where: { dailyRecordingId: recordingId },
      create: {
        courseId: groupContext?.courseId ?? null,
        sessionId: session?.id ?? null,
        coachId: session?.coachId ?? course?.coachId ?? null,
        recurrenceOccurrenceKey:
          groupContext?.recurrenceOccurrenceKey ?? session?.recurrenceOccurrenceKey ?? null,
        dailyRecordingId: recordingId,
        title:
          session?.title ||
          course?.title ||
          `Coaching ${scheduledAt ? scheduledAt.toLocaleDateString("nl-NL") : ""}`.trim(),
        summary,
        transcript,
        transcriptSourceUrl,
        scheduledAt: scheduledAt ?? session?.scheduledAt ?? null,
        durationSecs: duration ?? null,
      },
      update: {
        durationSecs: duration ?? undefined,
        summary: summary ?? undefined,
        transcript: transcript ?? undefined,
        transcriptSourceUrl: transcriptSourceUrl ?? undefined,
      },
    });

    if (type === "recording.ready-to-download") {
      try {
        await uploadCoachingRecordingToGoogleDrive(recording.id);
      } catch (error) {
        console.error("Google Drive recording upload failed:", error);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Daily webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
