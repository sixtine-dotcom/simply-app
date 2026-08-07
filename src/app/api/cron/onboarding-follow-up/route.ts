import { FormAssignmentAudienceType, FormResponseStatus, FormStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { createAuditLog, createRegistrationToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendRegistrationEmail, sendRequiredFormReminderEmail } from "@/lib/email";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get("secret");
    const expected = process.env.CRON_SECRET;
    if (expected && secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const cooldownThreshold = new Date(now.getTime() - COOLDOWN_MS);
    const appUrl = process.env.APP_URL || "http://localhost:3000";

    const [pendingUsers, recentInviteLogs, pendingAssignments, recentFormReminderLogs] =
      await Promise.all([
        db.user.findMany({
          where: {
            deletedAt: null,
            lastLoginAt: null,
            emailVerified: null,
            tenantId: { not: null },
          },
          select: {
            id: true,
            email: true,
            tenantId: true,
          },
          take: 500,
          orderBy: { createdAt: "desc" },
        }),
        db.auditLog.findMany({
          where: {
            action: "user.invited",
            createdAt: { gte: cooldownThreshold },
          },
          select: {
            metadata: true,
          },
          take: 1000,
          orderBy: { createdAt: "desc" },
        }),
        db.formAssignment.findMany({
          where: {
            isActive: true,
            isRequired: true,
            audienceType: FormAssignmentAudienceType.USER,
            userId: { not: null },
            form: {
              status: FormStatus.PUBLISHED,
            },
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            responses: {
              none: {
                status: FormResponseStatus.SUBMITTED,
              },
            },
          },
          include: {
            form: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                deletedAt: true,
              },
            },
          },
          take: 500,
          orderBy: { createdAt: "desc" },
        }),
        db.auditLog.findMany({
          where: {
            action: "form.reminder_sent",
            createdAt: { gte: cooldownThreshold },
          },
          select: {
            metadata: true,
          },
          take: 1000,
          orderBy: { createdAt: "desc" },
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

    const recentlyRemindedAssignmentIds = new Set(
      recentFormReminderLogs
        .map((log) =>
          log.metadata && typeof log.metadata === "object"
            ? ((log.metadata as Record<string, unknown>).assignmentId as string | undefined)
            : undefined
        )
        .filter((value): value is string => Boolean(value))
    );

    let activationSent = 0;
    let activationSkippedCooldown = 0;
    let activationFailed = 0;

    for (const pendingUser of pendingUsers) {
      if (!pendingUser.tenantId) continue;
      if (recentlyInvitedUserIds.has(pendingUser.id)) {
        activationSkippedCooldown += 1;
        continue;
      }

      const token = await createRegistrationToken(pendingUser.email, {
        accountType: "client",
        source: "cron_onboarding_follow_up",
      });

      const result = await sendRegistrationEmail(pendingUser.email, token);
      if (result.success) {
        activationSent += 1;
        await createAuditLog(
          "user.invited",
          null,
          {
            targetUserId: pendingUser.id,
            targetUserEmail: pendingUser.email,
            source: "cron_follow_up",
            resent: true,
          },
          undefined,
          pendingUser.tenantId
        );
      } else {
        activationFailed += 1;
      }
    }

    let formsSent = 0;
    let formsSkippedCooldown = 0;
    let formsFailed = 0;

    for (const assignment of pendingAssignments) {
      if (!assignment.user || assignment.user.deletedAt || !assignment.tenantId) continue;
      if (recentlyRemindedAssignmentIds.has(assignment.id)) {
        formsSkippedCooldown += 1;
        continue;
      }

      const result = await sendRequiredFormReminderEmail({
        email: assignment.user.email,
        firstName: assignment.user.firstName || "",
        formTitle: assignment.form.title,
        formUrl: `${appUrl}/forms/${assignment.form.slug}`,
        dueAt: assignment.dueAt,
      });

      if (result.success) {
        formsSent += 1;
        await Promise.all([
          createAuditLog(
            "form.reminder_sent",
            null,
            {
              assignmentId: assignment.id,
              formId: assignment.form.id,
              userId: assignment.user.id,
              email: assignment.user.email,
              source: "cron_follow_up",
            },
            undefined,
            assignment.tenantId
          ),
          db.notification.create({
            data: {
              userId: assignment.user.id,
              type: "reminder",
              title: `Open formulier: ${assignment.form.title}`,
              body: "Je hebt nog een verplicht formulier openstaan.",
              link: `/forms/${assignment.form.slug}`,
            },
          }),
        ]);
      } else {
        formsFailed += 1;
      }
    }

    await createAuditLog("cron.onboarding_follow_up", null, {
      activations: {
        sent: activationSent,
        skippedCooldown: activationSkippedCooldown,
        failed: activationFailed,
      },
      forms: {
        sent: formsSent,
        skippedCooldown: formsSkippedCooldown,
        failed: formsFailed,
      },
    });

    return NextResponse.json({
      ok: true,
      activations: {
        checked: pendingUsers.length,
        sent: activationSent,
        skippedCooldown: activationSkippedCooldown,
        failed: activationFailed,
      },
      forms: {
        checked: pendingAssignments.length,
        sent: formsSent,
        skippedCooldown: formsSkippedCooldown,
        failed: formsFailed,
      },
    });
  } catch (error) {
    console.error("Onboarding follow-up cron error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
