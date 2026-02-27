import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET: list all enrolled courses that have progress photo moments,
 * with per-course moments and existing ProgressPhoto data.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const enrollments = await db.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: true,
      },
    });

    const withPhotoMoments = enrollments.filter(
      (e) =>
        e.course.photoMomentsCount > 0 &&
        e.course.photoMomentsIntervalWeeks != null &&
        e.course.photoMomentsIntervalWeeks > 0
    );

    const existing = await db.progressPhoto.findMany({
      where: {
        userId: user.id,
        courseId: { in: withPhotoMoments.map((e) => e.courseId) },
      },
      orderBy: { periodIndex: "asc" },
    });

    const byCourse = new Map<string, typeof existing>();
    for (const p of existing) {
      if (!byCourse.has(p.courseId)) byCourse.set(p.courseId, []);
      byCourse.get(p.courseId)!.push(p);
    }

    const courses = withPhotoMoments.map((e) => {
      const course = e.course;
      const count = course.photoMomentsCount ?? 0;
      const intervalWeeks = course.photoMomentsIntervalWeeks ?? 0;
      const photos = byCourse.get(course.id) ?? [];
      const byPeriod = Object.fromEntries(photos.map((p) => [p.periodIndex, p]));

      const moments = Array.from({ length: count }, (_, i) => {
        const row = byPeriod[i];
        return {
          periodIndex: i,
          weekLabel: `Week ${i * intervalWeeks}`,
          beforePhotoUrl: row?.beforePhotoUrl ?? null,
          afterPhotoUrl: row?.afterPhotoUrl ?? null,
          submittedAt: row?.submittedAt ?? null,
        };
      });

      return {
        courseId: course.id,
        courseTitle: course.title,
        courseSlug: course.slug,
        enrollmentStartDate: e.startDate,
        intervalWeeks,
        moments,
      };
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Progress photos list error:", error);
    return NextResponse.json(
      { error: "Kon gegevens niet ophalen" },
      { status: 500 }
    );
  }
}
