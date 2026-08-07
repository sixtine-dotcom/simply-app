import { NextResponse } from "next/server";
import { createAuditLog, getCurrentUser, startImpersonation } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;

    const targetUser = await db.user.findFirst({
      where: {
        id,
        deletedAt: null,
        role: "CLIENT",
        ...(currentUser.tenantId ? { tenantId: currentUser.tenantId } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await startImpersonation(currentUser.id, targetUser.id, targetUser.tenantId);

    await createAuditLog(
      "admin.user.impersonated",
      currentUser.id,
      {
        targetUserId: targetUser.id,
        targetEmail: targetUser.email,
        targetRole: targetUser.role,
        source: "admin_user_detail",
      },
      undefined,
      currentUser.tenantId
    );

    return NextResponse.json({
      success: true,
      redirectTo: "/",
      impersonatedUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: `${targetUser.firstName} ${targetUser.lastName}`.trim(),
      },
    });
  } catch (error) {
    console.error("Admin user impersonation error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
