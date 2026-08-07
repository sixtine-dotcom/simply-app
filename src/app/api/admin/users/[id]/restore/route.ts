import { NextRequest, NextResponse } from "next/server";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = await getCurrentUser();

    if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const targetUser = await db.user.findFirst({
      where: {
        id,
        deletedAt: { not: null },
        ...(admin.tenantId ? { tenantId: admin.tenantId } : {}),
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }

    await db.user.update({
      where: { id: targetUser.id },
      data: { deletedAt: null },
    });

    await createAuditLog(
      "user.restored",
      admin.id,
      {
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        source: "user_detail",
      },
      undefined,
      admin.tenantId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Restore admin user error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
