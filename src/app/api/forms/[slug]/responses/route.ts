import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import { getAssignedFormForUserBySlug, upsertFormResponse } from "@/lib/forms";
import { syncNutritionPlanForEnrollment } from "@/lib/nutrition-plan-assignment";
import { FormAnswerValidationError } from "@/lib/form-fields";

const submitSchema = z.object({
  submit: z.boolean().default(true),
  answers: z.array(
    z.object({
      questionId: z.string(),
      value: z.unknown(),
    })
  ),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { slug } = await params;
    const assignedForm = await getAssignedFormForUserBySlug({
      slug,
      userId: user.id,
      role: user.role,
      tenantId: user.tenantId,
    });

    if (!assignedForm) {
      return NextResponse.json({ error: "Formulier niet beschikbaar" }, { status: 404 });
    }

    const body = submitSchema.parse(await request.json());

    const response = await upsertFormResponse({
      tenantId: user.tenantId!,
      formId: assignedForm.assignment.form.id,
      assignmentId: assignedForm.assignment.id,
      userId: user.id,
      answers: body.answers.map((answer) => ({
        questionId: answer.questionId,
        value: answer.value,
      })),
      submit: body.submit,
    });

    if (body.submit) {
      await createAuditLog(
        "form.submitted",
        user.id,
        {
          formId: assignedForm.assignment.form.id,
          assignmentId: assignedForm.assignment.id,
          responseId: response?.id,
        },
        undefined,
        user.tenantId!
      );

      if (assignedForm.assignment.courseId && assignedForm.assignment.blocksCourseAccess) {
        await syncNutritionPlanForEnrollment({
          userId: user.id,
          courseId: assignedForm.assignment.courseId,
        });
      }
    }

    return NextResponse.json({ response });
  } catch (error) {
    if (error instanceof FormAnswerValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Submit form response error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
