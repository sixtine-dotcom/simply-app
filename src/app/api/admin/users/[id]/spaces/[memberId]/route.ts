import { NextRequest, NextResponse } from "next/server";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const membership = await db.spaceMember.findFirst({
      where: {
        id: memberId,
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
        space: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Communitytoegang niet gevonden" }, { status: 404 });
    }

    await db.spaceMember.delete({
      where: { id: membership.id },
    });

    await createAuditLog(
      "space.member_removed",
      user.id,
      {
        spaceId: membership.space.id,
        spaceName: membership.space.name,
        memberId: membership.id,
        targetUserId: membership.user.id,
        targetUserEmail: membership.user.email,
        source: "user_detail",
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove user space membership error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
