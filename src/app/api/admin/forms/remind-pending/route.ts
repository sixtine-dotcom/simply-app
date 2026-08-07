import { FormResponseStatus, FormStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendRequiredFormReminderEmail } from "@/lib/email";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN" && user.role !== "SUPERADMIN" || !user.tenantId) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const cooldownThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [assignments, recentReminderLogs] = await Promise.all([
      db.formAssignment.findMany({
        where: {
          tenantId: user.tenantId,
          isActive: true,
          isRequired: true,
          audienceType: "USER",
          userId: { not: null },
          form: {
            status: FormStatus.PUBLISHED,
          },
          OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
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
          responses: {
            where: {
              status: FormResponseStatus.SUBMITTED,
            },
            select: { id: true },
            take: 1,
          },
        },
        take: 250,
        orderBy: { createdAt: "desc" },
      }),
      db.auditLog.findMany({
        where: {
          tenantId: user.tenantId,
          action: "form.reminder_sent",
          createdAt: {
            gte: cooldownThreshold,
          },
        },
        select: {
          metadata: true,
        },
      }),
    ]);

    const recentlyRemindedAssignmentIds = new Set(
      recentReminderLogs
        .map((log) =>
          log.metadata && typeof log.metadata === "object"
            ? ((log.metadata as Record<string, unknown>).assignmentId as string | undefined)
            : undefined
        )
        .filter((value): value is string => Boolean(value))
    );

    const pendingAssignments = assignments.filter(
      (assignment) =>
        assignment.user &&
        !assignment.user.deletedAt &&
        assignment.responses.length === 0 &&
        !recentlyRemindedAssignmentIds.has(assignment.id)
    );

    if (pendingAssignments.length === 0) {
      return NextResponse.json({
        success: true,
        reminded: 0,
        failed: 0,
        message: "Er zijn geen open verplichte user-formulieren om op te volgen.",
      });
    }

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    let reminded = 0;
    const failedEmails: string[] = [];
    let skippedCooldown = 0;

    for (const assignment of assignments) {
      if (
        assignment.user &&
        !assignment.user.deletedAt &&
        assignment.responses.length === 0 &&
        recentlyRemindedAssignmentIds.has(assignment.id)
      ) {
        skippedCooldown += 1;
      }
    }

    for (const assignment of pendingAssignments) {
      const targetUser = assignment.user;
      if (!targetUser) continue;

      const result = await sendRequiredFormReminderEmail({
        email: targetUser.email,
        firstName: targetUser.firstName || "",
        formTitle: assignment.form.title,
        formUrl: `${appUrl}/forms/${assignment.form.slug}`,
        dueAt: assignment.dueAt,
      });

      if (result.success) {
        reminded += 1;
        await createAuditLog(
          "form.reminder_sent",
          user.id,
          {
            assignmentId: assignment.id,
            formId: assignment.form.id,
            userId: targetUser.id,
            email: targetUser.email,
          },
          undefined,
          user.tenantId
        );
      } else {
        failedEmails.push(targetUser.email);
      }
    }

    await createAuditLog(
      "forms.remind_pending",
      user.id,
      {
        reminded,
        failed: failedEmails.length,
        total: pendingAssignments.length,
        skippedCooldown,
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({
      success: true,
      reminded,
      failed: failedEmails.length,
      failedEmails,
      skippedCooldown,
      message:
        reminded > 0
          ? `${reminded} formulierherinnering(en) verstuurd.${skippedCooldown > 0 ? ` ${skippedCooldown} overgeslagen door reminder-cooldown.` : ""}`
          : "Open formulieren gevonden, maar de herinneringen konden niet verstuurd worden.",
    });
  } catch (error) {
    console.error("Remind pending forms error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
