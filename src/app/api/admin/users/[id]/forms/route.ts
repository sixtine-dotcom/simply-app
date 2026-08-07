import { NextRequest, NextResponse } from "next/server";
import { FormStatus } from "@prisma/client";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const assignUserFormSchema = z.object({
  formId: z.string().min(1, "Selecteer een formulier"),
  isRequired: z.boolean().optional(),
  dueAt: z.string().nullable().optional(),
});

function parseNullableDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN" && user.role !== "SUPERADMIN" || !user.tenantId) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = assignUserFormSchema.parse(await request.json());

    const [targetUser, form] = await Promise.all([
      db.user.findFirst({
        where: {
          id,
          tenantId: user.tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
          email: true,
        },
      }),
      db.form.findFirst({
        where: {
          id: body.formId,
          tenantId: user.tenantId,
          status: {
            in: [FormStatus.DRAFT, FormStatus.PUBLISHED],
          },
        },
        select: {
          id: true,
          title: true,
        },
      }),
    ]);

    if (!targetUser) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }

    if (!form) {
      return NextResponse.json({ error: "Formulier niet gevonden" }, { status: 404 });
    }

    const existingAssignment = await db.formAssignment.findFirst({
      where: {
        tenantId: user.tenantId,
        formId: form.id,
        audienceType: "USER",
        userId: targetUser.id,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (existingAssignment) {
      return NextResponse.json({
        success: true,
        matchedExistingAssignment: true,
      });
    }

    const assignment = await db.formAssignment.create({
      data: {
        tenantId: user.tenantId,
        formId: form.id,
        audienceType: "USER",
        userId: targetUser.id,
        title: `Direct toegewezen aan ${targetUser.email}`,
        isRequired: Boolean(body.isRequired),
        dueAt: parseNullableDate(body.dueAt),
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    await createAuditLog(
      "form.updated",
      user.id,
      {
        formId: form.id,
        assignmentId: assignment.id,
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        source: "user_detail",
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json({
      success: true,
      matchedExistingAssignment: false,
      assignmentId: assignment.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Assign user form error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
