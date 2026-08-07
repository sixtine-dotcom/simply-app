import { NextRequest, NextResponse } from "next/server";
import { createAuditLog, createRegistrationToken, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendRegistrationEmail } from "@/lib/email";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const targetUser = await db.user.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(user.tenantId ? { tenantId: user.tenantId } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        lastLoginAt: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }

    const recentInviteLogs = await db.auditLog.findMany({
      where: {
        tenantId: user.tenantId ?? undefined,
        action: "user.invited",
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        metadata: true,
      },
    });

    const hasRecentInvite = recentInviteLogs.some((log) => {
      if (!log.metadata || typeof log.metadata !== "object") return false;
      return (log.metadata as Record<string, unknown>).targetUserId === targetUser.id;
    });

    if (hasRecentInvite) {
      return NextResponse.json(
        {
          success: true,
          skippedCooldown: true,
          message: "Deze gebruiker kreeg minder dan 24 uur geleden al een activatielink.",
          lastLoginAt: targetUser.lastLoginAt,
        },
        { status: 200 }
      );
    }

    const registrationToken = await createRegistrationToken(targetUser.email, {
      accountType: "client",
      source: "admin_user_detail",
    });

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const registrationLink = `${appUrl}/register/complete?token=${registrationToken}`;

    let inviteSent = false;
    try {
      const emailResult = await sendRegistrationEmail(targetUser.email, registrationToken);
      inviteSent = emailResult.success;
    } catch (error) {
      console.error("Admin resend invite email error:", error);
    }

    await createAuditLog(
      "user.invited",
      user.id,
      {
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        source: "user_detail",
        resent: true,
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({
      success: true,
      message: inviteSent
        ? "Activatielink opnieuw verstuurd."
        : "Activatielink aangemaakt, maar kon niet per email verstuurd worden.",
      devRegistrationLink:
        process.env.NODE_ENV === "development" ? registrationLink : undefined,
      lastLoginAt: targetUser.lastLoginAt,
    });
  } catch (error) {
    console.error("Resend user invite error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
