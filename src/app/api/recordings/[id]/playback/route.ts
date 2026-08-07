import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRecordingAccessLink } from "@/lib/daily";

/**
 * GET: time-limited playback URL for a coaching recording (user must be enrolled in course)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { id } = await params;
    const validForSecs = Math.min(
      Math.max(parseInt(request.nextUrl.searchParams.get("valid_for_secs") || "3600", 10), 900),
      43200
    );
    const wantsDownload = request.nextUrl.searchParams.get("download") === "1";

    const recording = await db.coachingRecording.findUnique({
      where: { id },
      include: { course: true, session: true },
    });
    if (!recording) {
      return NextResponse.json({ error: "Opname niet gevonden" }, { status: 404 });
    }

    const isCoach =
      user.role === "ADMIN" ||
      user.role === "SUPERADMIN" ||
      recording.coachId === user.id ||
      recording.course?.coachId === user.id ||
      recording.session?.coachId === user.id;

    if (wantsDownload && !isCoach) {
      return NextResponse.json(
        { error: "Alleen coaches kunnen opnames downloaden" },
        { status: 403 }
      );
    }

    const enrollment = isCoach
      ? null
      : recording.courseId
        ? await db.enrollment.findUnique({
          where: {
            userId_courseId: { userId: user.id, courseId: recording.courseId },
          },
        })
        : null;
    if (!isCoach && !enrollment) {
      return NextResponse.json(
        { error: "Geen toegang tot deze opname" },
        { status: 403 }
      );
    }

    const { download_link, expires } = await getRecordingAccessLink(
      recording.dailyRecordingId,
      validForSecs
    );

    return NextResponse.json({
      url: download_link,
      expires,
      canDownload: isCoach,
    });
  } catch (error) {
    console.error("Recording playback error:", error);
    return NextResponse.json(
      { error: "Kon opname niet laden" },
      { status: 500 }
    );
  }
}
