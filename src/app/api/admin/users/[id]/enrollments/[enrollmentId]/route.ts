import { NextRequest, NextResponse } from "next/server";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { revokeCourseCommunityMembershipIfUnused } from "@/lib/course-community";
import { db } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> }
) {
  try {
    const { id, enrollmentId } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const enrollment = await db.enrollment.findFirst({
      where: {
        id: enrollmentId,
        userId: id,
        user: {
          ...(user.tenantId ? { tenantId: user.tenantId } : {}),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Inschrijving niet gevonden" }, { status: 404 });
    }

    await db.enrollment.delete({
      where: { id: enrollment.id },
    });

    await revokeCourseCommunityMembershipIfUnused({
      userId: enrollment.user.id,
      courseId: enrollment.course.id,
    });

    await createAuditLog(
      "enrollment.removed",
      user.id,
      {
        courseId: enrollment.course.id,
        courseTitle: enrollment.course.title,
        enrollmentId: enrollment.id,
        targetUserId: enrollment.user.id,
        targetUserEmail: enrollment.user.email,
        source: "user_detail",
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove user enrollment error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
