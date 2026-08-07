import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const updateUserSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  phone: z.string().trim().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = await getCurrentUser();

    if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = updateUserSchema.parse(await request.json());
    const targetUser = await db.user.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(admin.tenantId ? { tenantId: admin.tenantId } : {}),
      },
      select: {
        id: true,
        role: true,
        phone: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }

    if (targetUser.id === admin.id && body.role && body.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Je kunt je eigen adminrol hier niet verwijderen." },
        { status: 400 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id: targetUser.id },
      data: {
        ...(body.role ? { role: body.role } : {}),
        ...(body.phone !== undefined ? { phone: body.phone?.trim() || null } : {}),
      },
      select: {
        id: true,
        role: true,
        phone: true,
      },
    });

    await createAuditLog(
      "user.updated",
      admin.id,
      {
        targetUserId: updatedUser.id,
        previousRole: targetUser.role,
        nextRole: updatedUser.role,
        previousPhone: targetUser.phone,
        nextPhone: updatedUser.phone,
        source: "user_detail",
      },
      undefined,
      admin.tenantId
    );

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Update admin user error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = await getCurrentUser();

    if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    if (id === admin.id) {
      return NextResponse.json(
        { error: "Je kunt je eigen account niet archiveren." },
        { status: 400 }
      );
    }

    const targetUser = await db.user.findFirst({
      where: {
        id,
        deletedAt: null,
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
      data: { deletedAt: new Date() },
    });

    await createAuditLog(
      "user.deleted",
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
    console.error("Archive admin user error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
