import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "ADMIN" && user.role !== "COACH" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const courses = await db.course.findMany({
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        enrollments: {
          where: {
            user: {
              tenantId: user.tenantId,
              deletedAt: null,
              role: "CLIENT",
            },
          },
          select: {
            userId: true,
          },
        },
      },
    });

    return NextResponse.json(
      courses.map((course) => ({
        id: course.id,
        title: course.title,
        participantIds: course.enrollments.map((enrollment) => enrollment.userId),
        participantCount: course.enrollments.length,
      }))
    );
  } catch (error) {
    console.error("Get session participant groups error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
