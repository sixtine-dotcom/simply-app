import { BiologicalSex, FormResponseStatus } from "@prisma/client";
import { db } from "@/lib/db";

function safeFilePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "Klant";
}

function answerToSex(value: unknown): BiologicalSex | null {
  const text = Array.isArray(value) ? value.map(String).join(" ") : String(value || "");
  if (/vrouw/i.test(text)) return BiologicalSex.FEMALE;
  if (/man/i.test(text)) return BiologicalSex.MALE;
  return null;
}

export async function syncNutritionPlanForEnrollment(params: {
  userId: string;
  courseId: string;
}) {
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: params },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          healthProfile: { select: { biologicalSex: true } },
        },
      },
    },
  });
  if (!enrollment) return { status: "no_enrollment" as const };

  const submittedIntake = await db.formResponse.findFirst({
    where: {
      userId: params.userId,
      status: FormResponseStatus.SUBMITTED,
      assignment: {
        courseId: params.courseId,
        audienceType: "COURSE",
        isRequired: true,
        blocksCourseAccess: true,
        isActive: true,
      },
    },
    orderBy: { submittedAt: "desc" },
    include: {
      answers: {
        include: { question: { select: { title: true } } },
      },
    },
  });
  if (!submittedIntake) return { status: "intake_pending" as const };

  const intakeSex = submittedIntake.answers.find((answer) =>
    /welk voedingsschema past bij jou/i.test(answer.question.title)
  );
  const biologicalSex =
    enrollment.user.healthProfile?.biologicalSex || answerToSex(intakeSex?.value);
  if (!biologicalSex) return { status: "profile_incomplete" as const };

  const template = await db.nutritionPlanTemplate.findUnique({
    where: {
      courseId_biologicalSex: {
        courseId: params.courseId,
        biologicalSex,
      },
    },
  });
  if (!template?.isActive) return { status: "template_missing" as const };

  const fullName = `${enrollment.user.firstName} ${enrollment.user.lastName}`.trim();
  const displayFileName = `Voedingsschema-${safeFilePart(fullName)}.pdf`;
  const title = `Voedingsschema voor ${fullName || "jou"}`;

  const plan = await db.nutritionPlan.upsert({
    where: {
      userId_courseId: {
        userId: params.userId,
        courseId: params.courseId,
      },
    },
    update: {
      templateId: template.id,
      title,
      fileUrl: template.fileUrl,
      displayFileName,
      availableAt: enrollment.startDate,
    },
    create: {
      userId: params.userId,
      courseId: params.courseId,
      templateId: template.id,
      title,
      fileUrl: template.fileUrl,
      displayFileName,
      availableAt: enrollment.startDate,
    },
  });
  return { status: "assigned" as const, plan };
}

export async function syncNutritionPlansForCourse(courseId: string) {
  const enrollments = await db.enrollment.findMany({
    where: { courseId },
    select: { userId: true },
  });
  return Promise.all(
    enrollments.map((enrollment) =>
      syncNutritionPlanForEnrollment({ userId: enrollment.userId, courseId })
    )
  );
}
