import { FormAssignmentAudienceType, FormResponseStatus, FormStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { createAuditLog, createRegistrationToken, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendRegistrationEmail, sendRequiredFormReminderEmail } from "@/lib/email";

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  return user && user.role === "SUPERADMIN" ? user : null;
}

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { id } = await params;
    const tenant = await db.tenant.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant niet gevonden" }, { status: 404 });
    }

    const cooldownThreshold = new Date(Date.now() - COOLDOWN_MS);
    const appUrl = process.env.APP_URL || "http://localhost:3000";

    const [pendingUsers, recentInviteLogs, pendingAssignments, recentFormReminderLogs] =
      await Promise.all([
        db.user.findMany({
          where: {
            tenantId: id,
            deletedAt: null,
            lastLoginAt: null,
            emailVerified: null,
          },
          select: {
            id: true,
            email: true,
          },
          take: 250,
          orderBy: { createdAt: "desc" },
        }),
        db.auditLog.findMany({
          where: {
            tenantId: id,
            action: "user.invited",
            createdAt: { gte: cooldownThreshold },
          },
          select: { metadata: true },
          take: 500,
        }),
        db.formAssignment.findMany({
          where: {
            tenantId: id,
            isActive: true,
            isRequired: true,
            audienceType: FormAssignmentAudienceType.USER,
            userId: { not: null },
            form: {
              status: FormStatus.PUBLISHED,
            },
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
          take: 250,
          orderBy: { createdAt: "desc" },
        }),
        db.auditLog.findMany({
          where: {
            tenantId: id,
            action: "form.reminder_sent",
            createdAt: { gte: cooldownThreshold },
          },
          select: { metadata: true },
          take: 500,
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

    let activationsSent = 0;
    let activationsSkippedCooldown = 0;
    let formsSent = 0;
    let formsSkippedCooldown = 0;

    for (const pendingUser of pendingUsers) {
      if (recentlyInvitedUserIds.has(pendingUser.id)) {
        activationsSkippedCooldown += 1;
        continue;
      }

      const token = await createRegistrationToken(pendingUser.email, {
        accountType: "client",
        source: "superadmin_tenant_follow_up",
      });
      const result = await sendRegistrationEmail(pendingUser.email, token);
      if (result.success) {
        activationsSent += 1;
        await createAuditLog(
          "user.invited",
          user.id,
          {
            targetUserId: pendingUser.id,
            targetUserEmail: pendingUser.email,
            source: "platform_tenant_follow_up",
            resent: true,
          },
          undefined,
          id
        );
      }
    }

    for (const assignment of pendingAssignments) {
      if (!assignment.user || assignment.user.deletedAt) continue;
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
        await createAuditLog(
          "form.reminder_sent",
          user.id,
          {
            assignmentId: assignment.id,
            formId: assignment.form.id,
            userId: assignment.user.id,
            email: assignment.user.email,
            source: "platform_tenant_follow_up",
          },
          undefined,
          id
        );
      }
    }

    await createAuditLog(
      "platform.tenant.follow_up",
      user.id,
      {
        tenantId: id,
        tenantName: tenant.name,
        activationsSent,
        activationsSkippedCooldown,
        formsSent,
        formsSkippedCooldown,
      },
      undefined,
      id
    );

    return NextResponse.json({
      success: true,
      activationsSent,
      activationsSkippedCooldown,
      formsSent,
      formsSkippedCooldown,
      message: "Follow-up uitgevoerd.",
    });
  } catch (error) {
    console.error("Tenant follow-up error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
