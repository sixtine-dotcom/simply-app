import { NextRequest, NextResponse } from "next/server";
import { FormQuestionType, FormStatus, Role } from "@prisma/client";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import {
  getAdminFormBuilderData,
  normalizeQuestionPayload,
  slugifyFormValue,
} from "@/lib/forms";
import { db } from "@/lib/db";

const questionSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Vraagtitel is verplicht"),
  description: z.string().nullable().optional(),
  type: z.nativeEnum(FormQuestionType),
  position: z.number().int().min(0).optional(),
  isRequired: z.boolean().optional(),
  placeholder: z.string().nullable().optional(),
  helperText: z.string().nullable().optional(),
  options: z.array(z.string()).optional(),
});

const assignmentSchema = z.object({
  id: z.string().optional(),
  audienceType: z.enum(["ROLE", "COURSE", "SPACE", "USER"]),
  audienceRole: z.nativeEnum(Role).nullable().optional(),
  courseId: z.string().nullable().optional(),
  spaceId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  isRequired: z.boolean().optional(),
  blocksCourseAccess: z.boolean().optional(),
  startsAt: z.string().nullable().optional(),
  dueAt: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

const updateFormSchema = z.object({
  title: z.string().trim().min(2, "Titel is verplicht"),
  slug: z.string().trim().min(2, "Slug is verplicht"),
  description: z.string().nullable().optional(),
  status: z.nativeEnum(FormStatus),
  introTitle: z.string().nullable().optional(),
  introDescription: z.string().nullable().optional(),
  submitButtonLabel: z.string().nullable().optional(),
  successTitle: z.string().nullable().optional(),
  successDescription: z.string().nullable().optional(),
  isOnboardingForm: z.boolean().optional(),
  questions: z.array(questionSchema).default([]),
  assignments: z.array(assignmentSchema).default([]),
});

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN") || !user.tenantId) return null;
  return user;
}

function parseNullableDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { id } = await params;
    const data = await getAdminFormBuilderData(id, user.tenantId!);
    if (!data) {
      return NextResponse.json({ error: "Formulier niet gevonden" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Get form builder data error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { id } = await params;
    const body = updateFormSchema.parse(await request.json());
    const normalizedSlug = slugifyFormValue(body.slug);

    const existing = await db.form.findFirst({
      where: {
        slug: normalizedSlug,
        id: { not: id },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "Deze slug is al in gebruik" }, { status: 400 });
    }

    const currentForm = await db.form.findFirst({
      where: { id, tenantId: user.tenantId! },
      include: {
        questions: true,
        assignments: true,
      },
    });

    if (!currentForm) {
      return NextResponse.json({ error: "Formulier niet gevonden" }, { status: 404 });
    }

    const normalizedQuestions = body.questions.map((question, index) =>
      normalizeQuestionPayload(question, index)
    );
    const questionIdsToKeep = normalizedQuestions.map((question) => question.id).filter(Boolean) as string[];
    const assignmentIdsToKeep = body.assignments.map((assignment) => assignment.id).filter(Boolean) as string[];

    await db.$transaction(async (tx) => {
      await tx.form.update({
        where: { id: currentForm.id },
        data: {
          title: body.title,
          slug: normalizedSlug,
          description: body.description?.trim() || null,
          status: body.status,
          introTitle: body.introTitle?.trim() || null,
          introDescription: body.introDescription?.trim() || null,
          submitButtonLabel: body.submitButtonLabel?.trim() || null,
          successTitle: body.successTitle?.trim() || null,
          successDescription: body.successDescription?.trim() || null,
          isOnboardingForm: Boolean(body.isOnboardingForm),
        },
      });

      await tx.formQuestion.deleteMany({
        where: {
          formId: currentForm.id,
          ...(questionIdsToKeep.length > 0 ? { id: { notIn: questionIdsToKeep } } : {}),
        },
      });

      for (let index = 0; index < normalizedQuestions.length; index += 1) {
        const question = normalizedQuestions[index];
        const payload = {
          title: question.title,
          description: question.description,
          type: question.type,
          position: index,
          isRequired: question.isRequired,
          placeholder: question.placeholder,
          helperText: question.helperText,
          options: question.options,
        };

        if (question.id) {
          await tx.formQuestion.update({
            where: { id: question.id },
            data: payload,
          });
        } else {
          await tx.formQuestion.create({
            data: {
              formId: currentForm.id,
              ...payload,
            },
          });
        }
      }

      await tx.formAssignment.deleteMany({
        where: {
          formId: currentForm.id,
          ...(assignmentIdsToKeep.length > 0 ? { id: { notIn: assignmentIdsToKeep } } : {}),
        },
      });

      for (const assignment of body.assignments) {
        const payload = {
          tenantId: user.tenantId!,
          audienceType: assignment.audienceType,
          audienceRole: assignment.audienceType === "ROLE" ? assignment.audienceRole || null : null,
          courseId: assignment.audienceType === "COURSE" ? assignment.courseId || null : null,
          spaceId: assignment.audienceType === "SPACE" ? assignment.spaceId || null : null,
          userId: assignment.audienceType === "USER" ? assignment.userId || null : null,
          title: assignment.title?.trim() || null,
          isRequired: Boolean(assignment.isRequired),
          blocksCourseAccess:
            assignment.audienceType === "COURSE" && Boolean(assignment.isRequired)
              ? Boolean(assignment.blocksCourseAccess)
              : false,
          startsAt: parseNullableDate(assignment.startsAt),
          dueAt: parseNullableDate(assignment.dueAt),
          isActive: assignment.isActive ?? true,
        };

        if (assignment.id) {
          await tx.formAssignment.update({
            where: { id: assignment.id },
            data: payload,
          });
        } else {
          await tx.formAssignment.create({
            data: {
              formId: currentForm.id,
              ...payload,
            },
          });
        }
      }
    });

    await createAuditLog(
      "form.updated",
      user.id,
      { formId: currentForm.id, source: "admin_builder" },
      undefined,
      user.tenantId!
    );

    const data = await getAdminFormBuilderData(currentForm.id, user.tenantId!);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Update form error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const { id } = await params;
    const form = await db.form.findFirst({
      where: { id, tenantId: user.tenantId! },
      select: {
        id: true,
        _count: {
          select: {
            responses: true,
          },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Formulier niet gevonden" }, { status: 404 });
    }

    if (form._count.responses > 0) {
      return NextResponse.json(
        { error: "Dit formulier heeft al antwoorden en kan niet verwijderd worden." },
        { status: 400 }
      );
    }

    await db.form.delete({ where: { id: form.id } });

    await createAuditLog(
      "form.deleted",
      user.id,
      { formId: form.id },
      undefined,
      user.tenantId!
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete form error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
