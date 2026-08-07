import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAuditLog, getCurrentUser } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id, memberId } = await params;
    const membership = await db.spaceMember.findFirst({
      where: {
        id: memberId,
        spaceId: id,
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

    if (!membership) {
      return NextResponse.json({ error: "Membership not found" }, { status: 404 });
    }

    await db.spaceMember.delete({
      where: { id: membership.id },
    });

    await createAuditLog(
      "space.member_removed",
      user.id,
      {
        spaceId: id,
        memberId: membership.id,
        targetUserId: membership.user.id,
        email: membership.user.email,
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove space member error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
