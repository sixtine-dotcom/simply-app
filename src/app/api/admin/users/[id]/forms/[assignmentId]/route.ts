import { NextRequest, NextResponse } from "next/server";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { id, assignmentId } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN" && user.role !== "SUPERADMIN" || !user.tenantId) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const assignment = await db.formAssignment.findFirst({
      where: {
        id: assignmentId,
        userId: id,
        tenantId: user.tenantId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        form: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Formuliertoewijzing niet gevonden" }, { status: 404 });
    }

    if (!assignment.user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }

    await db.formAssignment.delete({
      where: { id: assignment.id },
    });

    await createAuditLog(
      "form.updated",
      user.id,
      {
        formId: assignment.form.id,
        formTitle: assignment.form.title,
        assignmentId: assignment.id,
        targetUserId: assignment.user.id,
        targetUserEmail: assignment.user.email,
        action: "assignment_removed",
        source: "user_detail",
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user form assignment error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
