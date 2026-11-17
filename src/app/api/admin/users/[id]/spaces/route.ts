import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addCommunityMemberSilently } from "@/lib/community-membership";

const assignUserSpaceSchema = z.object({
  spaceId: z.string().min(1, "Selecteer een community"),
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

    const body = assignUserSpaceSchema.parse(await request.json());

    const [targetUser, space] = await Promise.all([
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
      db.space.findUnique({
        where: { id: body.spaceId },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    if (!targetUser) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }

    if (!space) {
      return NextResponse.json({ error: "Community niet gevonden" }, { status: 404 });
    }

    const added = await addCommunityMemberSilently(targetUser.id, space.id);
    if (!added) return NextResponse.json({ success: true, matchedExistingMembership: true });
    const membership = await db.spaceMember.findUniqueOrThrow({
      where: { userId_spaceId: { userId: targetUser.id, spaceId: space.id } },
      select: { id: true },
    });

    await createAuditLog(
      "space.members_added",
      user.id,
      {
        spaceId: space.id,
        spaceName: space.name,
        memberId: membership.id,
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        source: "user_detail",
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({
      success: true,
      matchedExistingMembership: false,
      memberId: membership.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Assign user space error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
