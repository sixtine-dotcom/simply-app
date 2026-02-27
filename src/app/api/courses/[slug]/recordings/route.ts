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
      select: { id: true, title: true },
    });
    if (!course) {
      return NextResponse.json({ error: "Cursus niet gevonden" }, { status: 404 });
    }

    const enrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId: course.id },
      },
    });
    if (!enrollment) {
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
        scheduledAt: r.scheduledAt,
        durationSecs: r.durationSecs,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("Course recordings error:", error);
    return NextResponse.json(
      { error: "Kon opnames niet laden" },
      { status: 500 }
    );
  }
}
