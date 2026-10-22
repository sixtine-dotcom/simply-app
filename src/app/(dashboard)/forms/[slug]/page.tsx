import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAssignedFormForUserBySlug, parseQuestionOptions } from "@/lib/forms";
import { FormRunner } from "./form-runner";

export default async function AssignedFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { slug } = await params;
  const assignedForm = await getAssignedFormForUserBySlug({
    slug,
    userId: user.id,
    role: user.role,
    tenantId: user.tenantId,
  });

  const previewForm =
    !assignedForm && user.role === "ADMIN" && user.tenantId
      ? await db.form.findFirst({
          where: {
            slug,
            tenantId: user.tenantId,
          },
          include: {
            questions: {
              orderBy: { position: "asc" },
            },
          },
        })
      : null;

  if (!assignedForm && !previewForm) {
    notFound();
  }

  const initialAnswers = Object.fromEntries(
    (assignedForm?.response?.answers || []).map((answer) => [answer.questionId, answer.value])
  );

  const formSource = assignedForm
    ? {
        id: assignedForm.assignment.form.id,
        slug: assignedForm.assignment.form.slug,
        title: assignedForm.assignment.form.title,
        description: assignedForm.assignment.form.description,
        introTitle: assignedForm.assignment.form.introTitle,
        introDescription: assignedForm.assignment.form.introDescription,
        submitButtonLabel: assignedForm.assignment.form.submitButtonLabel,
        successTitle: assignedForm.assignment.form.successTitle,
        successDescription: assignedForm.assignment.form.successDescription,
        assignment: {
          id: assignedForm.assignment.id,
          title: assignedForm.assignment.title,
          isRequired: assignedForm.assignment.isRequired,
          dueAt: assignedForm.assignment.dueAt?.toISOString() || null,
        },
        response: assignedForm.response
          ? {
              id: assignedForm.response.id,
              status: assignedForm.response.status,
            }
          : null,
        questions: assignedForm.assignment.form.questions,
      }
    : {
        id: previewForm!.id,
        slug: previewForm!.slug,
        title: previewForm!.title,
        description: previewForm!.description,
        introTitle: previewForm!.introTitle,
        introDescription: previewForm!.introDescription,
        submitButtonLabel: previewForm!.submitButtonLabel,
        successTitle: previewForm!.successTitle,
        successDescription: previewForm!.successDescription,
        assignment: {
          id: "preview",
          title: "Admin preview",
          isRequired: false,
          dueAt: null,
        },
        response: null,
        isPreview: true,
        questions: previewForm!.questions,
      };

  return (
    <FormRunner
      form={{
        ...formSource,
        questions: formSource.questions.map((question) => ({
          id: question.id,
          title: question.title,
          description: question.description,
          type: question.type,
          isRequired: question.isRequired,
          placeholder: question.placeholder,
          helperText: question.helperText,
          options: parseQuestionOptions(question.options),
        })),
      }}
      initialAnswers={initialAnswers}
      userFirstName={user.firstName}
    />
  );
}
