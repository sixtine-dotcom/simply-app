import { NextRequest, NextResponse } from "next/server";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { revokeCourseCommunityMembershipIfUnused } from "@/lib/course-community";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { id: offerId, assignmentId } = await params;
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const assignment = await db.offerAssignment.findFirst({
      where: {
        id: assignmentId,
        offerId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment niet gevonden" }, { status: 404 });
    }

    const now = new Date();
    const linkedEnrollments = await db.enrollment.findMany({
      where: {
        offerAssignmentId: assignment.id,
      },
      select: {
        userId: true,
        courseId: true,
      },
    });

    await db.$transaction(async (tx) => {
      await tx.offerAssignment.update({
        where: { id: assignment.id },
        data: {
          revokedAt: now,
          endDate: assignment.endDate ?? now,
        },
      });

      await tx.enrollment.updateMany({
        where: {
          offerAssignmentId: assignment.id,
        },
        data: {
          endDate: now,
        },
      });
    });

    for (const enrollment of linkedEnrollments) {
      await revokeCourseCommunityMembershipIfUnused({
        userId: enrollment.userId,
        courseId: enrollment.courseId,
      });
    }

    await createAuditLog(
      "offer.access_revoked",
      user.id,
      {
        offerId,
        assignmentId: assignment.id,
        targetUserId: assignment.user.id,
        email: assignment.user.email,
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke offer access error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
