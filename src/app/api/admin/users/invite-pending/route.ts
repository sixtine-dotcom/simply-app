import { NextResponse } from "next/server";
import { createAuditLog, createRegistrationToken, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendRegistrationEmail } from "@/lib/email";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const cooldownThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [pendingUsers, recentInviteLogs] = await Promise.all([
      db.user.findMany({
        where: {
          deletedAt: null,
          lastLoginAt: null,
          emailVerified: null,
          ...(user.tenantId ? { tenantId: user.tenantId } : {}),
        },
        select: {
          id: true,
          email: true,
        },
        orderBy: { createdAt: "desc" },
        take: 250,
      }),
      db.auditLog.findMany({
        where: {
          tenantId: user.tenantId ?? undefined,
          action: "user.invited",
          createdAt: {
            gte: cooldownThreshold,
          },
        },
        select: {
          metadata: true,
        },
      }),
    ]);

    const recentlyInvitedUserIds = new Set(
      recentInviteLogs
        .map((log) =>
          log.metadata && typeof log.metadata === "object"
            ? ((log.metadata as Record<string, unknown>).targetUserId as string | undefined)
            : undefined
        )
        .filter((value): value is string => Boolean(value))
    );

    if (pendingUsers.length === 0) {
      return NextResponse.json({
        success: true,
        invited: 0,
        failed: 0,
        message: "Er zijn geen open activaties om opnieuw te versturen.",
      });
    }

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const devRegistrationLinks: { email: string; url: string }[] = [];
    let invited = 0;
    const failedEmails: string[] = [];
    let skippedCooldown = 0;

    for (const pendingUser of pendingUsers) {
      if (recentlyInvitedUserIds.has(pendingUser.id)) {
        skippedCooldown += 1;
        continue;
      }

      const registrationToken = await createRegistrationToken(pendingUser.email, {
        accountType: "client",
        source: "admin_users_bulk_invite",
      });

      if (process.env.NODE_ENV === "development") {
        devRegistrationLinks.push({
          email: pendingUser.email,
          url: `${appUrl}/register/complete?token=${registrationToken}`,
        });
      }

      try {
        const emailResult = await sendRegistrationEmail(
          pendingUser.email,
          registrationToken
        );
        if (emailResult.success) {
          invited += 1;
          await createAuditLog(
            "user.invited",
            user.id,
            {
              targetUserId: pendingUser.id,
              targetUserEmail: pendingUser.email,
              source: "bulk_pending",
              resent: true,
            },
            undefined,
            user.tenantId
          );
        } else {
          failedEmails.push(pendingUser.email);
        }
      } catch (error) {
        console.error("Bulk resend invite email error:", error);
        failedEmails.push(pendingUser.email);
      }
    }

    await createAuditLog(
      "users.invited_pending",
      user.id,
      {
        invited,
        failed: failedEmails.length,
        total: pendingUsers.length,
        skippedCooldown,
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({
      success: true,
      invited,
      failed: failedEmails.length,
      failedEmails,
      skippedCooldown,
      message:
        invited > 0
          ? `${invited} activatielink(s) opnieuw verstuurd.${skippedCooldown > 0 ? ` ${skippedCooldown} overgeslagen door cooldown.` : ""}`
          : skippedCooldown > 0
            ? `${skippedCooldown} gebruiker(s) overgeslagen door cooldown.`
            : "Activatielinks aangemaakt, maar konden niet per email verstuurd worden.",
      devRegistrationLinks:
        process.env.NODE_ENV === "development" ? devRegistrationLinks : undefined,
    });
  } catch (error) {
    console.error("Bulk resend pending invites error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
