import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { ensureCourseCommunityMembership } from "@/lib/course-community";
import { syncEnrollmentToRecurringGroupPlans } from "@/lib/coaching";
import { db } from "@/lib/db";

const assignUserEnrollmentSchema = z.object({
  courseId: z.string().min(1, "Selecteer een cursus"),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = assignUserEnrollmentSchema.parse(await request.json());

    const [targetUser, course] = await Promise.all([
      db.user.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(user.tenantId ? { tenantId: user.tenantId } : {}),
        },
        select: {
          id: true,
          email: true,
        },
      }),
      db.course.findUnique({
        where: { id: body.courseId },
        select: {
          id: true,
          title: true,
        },
      }),
    ]);

    if (!targetUser) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }

    if (!course) {
      return NextResponse.json({ error: "Cursus niet gevonden" }, { status: 404 });
    }

    const existing = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: targetUser.id,
          courseId: course.id,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ success: true, matchedExistingEnrollment: true });
    }

    const startDate =
      body.startDate && body.startDate.trim() ? new Date(body.startDate) : new Date();
    const endDate =
      body.endDate && body.endDate.trim() ? new Date(body.endDate) : null;

    const enrollment = await db.enrollment.create({
      data: {
        userId: targetUser.id,
        courseId: course.id,
        startDate,
        endDate,
      },
      select: { id: true },
    });

    await ensureCourseCommunityMembership({
      userId: targetUser.id,
      courseId: course.id,
    });
    await syncEnrollmentToRecurringGroupPlans({
      userId: targetUser.id,
      courseId: course.id,
    });

    await createAuditLog(
      "enrollments.added",
      user.id,
      {
        courseId: course.id,
        courseTitle: course.title,
        enrollmentId: enrollment.id,
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        startDate: startDate.toISOString(),
        endDate: endDate?.toISOString() ?? null,
        source: "user_detail",
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({
      success: true,
      matchedExistingEnrollment: false,
      enrollmentId: enrollment.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Assign user enrollment error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
