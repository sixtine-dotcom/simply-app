import { NextResponse } from "next/server";
import { createAuditLog, getCurrentUser, startImpersonation } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { id } = await params;

    const tenant = await db.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        users: {
          where: {
            deletedAt: null,
            role: {
              in: ["ADMIN", "COACH", "STAFF"],
            },
          },
          orderBy: [
            { role: "asc" },
            { createdAt: "asc" },
          ],
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            tenantId: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant niet gevonden" }, { status: 404 });
    }

    const targetUser =
      tenant.users.find((candidate) => candidate.role === "ADMIN") ||
      tenant.users.find((candidate) => candidate.role === "COACH") ||
      tenant.users[0];

    if (!targetUser) {
      return NextResponse.json(
        { error: "Deze tenant heeft nog geen admin-, coach- of staffaccount om als in te loggen." },
        { status: 400 }
      );
    }

    await startImpersonation(user.id, targetUser.id, targetUser.tenantId);
    await createAuditLog(
      "platform.user.impersonated",
      user.id,
      {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        targetUserId: targetUser.id,
        targetEmail: targetUser.email,
        targetRole: targetUser.role,
      },
      undefined,
      tenant.id
    );

    return NextResponse.json({
      success: true,
      redirectTo: targetUser.role === "ADMIN" ? "/admin" : "/",
      impersonatedUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: `${targetUser.firstName} ${targetUser.lastName}`.trim(),
        role: targetUser.role,
      },
    });
  } catch (error) {
    console.error("Impersonate tenant error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
