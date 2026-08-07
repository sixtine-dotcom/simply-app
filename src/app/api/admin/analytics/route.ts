import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdminUser("/admin/analytics");
    const tenantFilter = user.tenantId ? { tenantId: user.tenantId } : {};

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersLast30,
      newUsersLast7,
      totalEnrollments,
      activeEnrollments,
      totalLessonCompletions,
      courses,
      recentLogins,
      communityPosts,
      communityPostsLast30,
      coachingSessionsTotal,
      coachingSessionsCompleted,
    ] = await Promise.all([
      db.user.count({ where: { deletedAt: null, ...tenantFilter } }),
      db.user.count({
        where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo }, ...tenantFilter },
      }),
      db.user.count({
        where: { deletedAt: null, createdAt: { gte: sevenDaysAgo }, ...tenantFilter },
      }),
      db.enrollment.count(),
      db.enrollment.count({
        where: { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      }),
      db.progress.count({ where: { completedAt: { not: null } } }),
      db.course.findMany({
        where: { isPublished: true, ...tenantFilter },
        select: {
          id: true,
          title: true,
          enrollments: { select: { id: true } },
          modules: {
            select: {
              lessons: {
                select: {
                  id: true,
                  progress: {
                    where: { completedAt: { not: null } },
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
        take: 10,
      }),
      db.user.count({
        where: {
          deletedAt: null,
          lastLoginAt: { gte: sevenDaysAgo },
          ...tenantFilter,
        },
      }),
      db.post.count(),
      db.post.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.coachingSession.count(),
      db.coachingSession.count({ where: { status: "completed" } }),
    ]);

    // Build member growth data for the last 30 days
    const userGrowthRaw = await db.user.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: thirtyDaysAgo },
        ...tenantFilter,
      },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const growthByDay: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      growthByDay[key] = 0;
    }
    for (const u of userGrowthRaw) {
      const key = u.createdAt.toISOString().split("T")[0];
      if (key in growthByDay) growthByDay[key]++;
    }

    const memberGrowthChart = Object.entries(growthByDay).map(([date, count]) => ({
      date: new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "short" }).format(
        new Date(date)
      ),
      count,
    }));

    // Course completion rates
    const courseStats = courses.map((course) => {
      const totalLessons = course.modules.reduce(
        (sum: number, m: (typeof course.modules)[0]) => sum + m.lessons.length,
        0
      );
      const completedLessons = course.modules.reduce(
        (sum: number, m: (typeof course.modules)[0]) =>
          sum +
          m.lessons.reduce(
            (s: number, l: (typeof m.lessons)[0]) => s + l.progress.length,
            0
          ),
        0
      );
      const enrollments = course.enrollments.length;
      const avgCompletion =
        enrollments > 0 && totalLessons > 0
          ? Math.round((completedLessons / (enrollments * totalLessons)) * 100)
          : 0;

      return {
        title: course.title.length > 30 ? course.title.slice(0, 30) + "…" : course.title,
        enrollments,
        avgCompletion,
      };
    });

    return NextResponse.json({
      overview: {
        totalUsers,
        newUsersLast30,
        newUsersLast7,
        totalEnrollments,
        activeEnrollments,
        totalLessonCompletions,
        recentLogins,
        communityPosts,
        communityPostsLast30,
        coachingSessionsTotal,
        coachingSessionsCompleted,
      },
      memberGrowthChart,
      courseStats,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
