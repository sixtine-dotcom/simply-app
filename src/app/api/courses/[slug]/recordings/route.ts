import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET: list coaching recordings for this course (only if user is enrolled)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { slug } = await params;

    const course = await db.course.findUnique({
      where: { slug },
      select: { id: true, title: true, coachId: true },
    });
    if (!course) {
      return NextResponse.json({ error: "Cursus niet gevonden" }, { status: 404 });
    }

    const isCoach =
      user.role === "ADMIN" || user.role === "SUPERADMIN" || course.coachId === user.id;
    const enrollment = isCoach
      ? null
      : await db.enrollment.findUnique({
          where: {
            userId_courseId: { userId: user.id, courseId: course.id },
          },
        });
    if (!isCoach && !enrollment) {
      return NextResponse.json(
        { error: "Je bent niet ingeschreven voor deze cursus" },
        { status: 403 }
      );
    }

    const recordings = await db.coachingRecording.findMany({
      where: { courseId: course.id },
      orderBy: { scheduledAt: "desc" },
    });

    return NextResponse.json({
      course: { id: course.id, title: course.title },
      recordings: recordings.map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        transcript: isCoach ? r.transcript : null,
        hasTranscript: Boolean(r.transcript || r.transcriptSourceUrl),
        scheduledAt: r.scheduledAt,
        durationSecs: r.durationSecs,
        createdAt: r.createdAt,
      })),
      permissions: {
        canDownload: isCoach,
        canViewTranscript: isCoach,
      },
    });
  } catch (error) {
    console.error("Course recordings error:", error);
    return NextResponse.json(
      { error: "Kon opnames niet laden" },
      { status: 500 }
    );
  }
}
