import {
  FormAssignmentAudienceType,
  FormQuestionType,
  FormResponseStatus,
  FormStatus,
  Role,
} from "@prisma/client";
import { db } from "@/lib/db";

export const FORM_QUESTION_TYPE_OPTIONS = [
  { value: "SHORT_TEXT", label: "Korte tekst" },
  { value: "LONG_TEXT", label: "Lange tekst" },
  { value: "EMAIL", label: "E-mail" },
  { value: "PHONE", label: "Telefoon" },
  { value: "NUMBER", label: "Nummer" },
  { value: "MULTIPLE_CHOICE", label: "Meerkeuze" },
  { value: "CHECKBOXES", label: "Checkboxen" },
  { value: "DROPDOWN", label: "Dropdown" },
  { value: "DATE", label: "Datum" },
  { value: "YES_NO", label: "Ja / nee" },
  { value: "CONTACT_INFO", label: "Contactgegevens" },
  { value: "FILE_UPLOAD", label: "Bestand uploaden" },
] satisfies Array<{ value: FormQuestionType; label: string }>;

export function parseQuestionOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

export function formatFormAnswerValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value.map((entry) => formatFormAnswerValue(entry)).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function slugifyFormValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function normalizeQuestionPayload(
  question: {
    id?: string;
    title: string;
    description?: string | null;
    type: FormQuestionType;
    position?: number;
    isRequired?: boolean;
    placeholder?: string | null;
    helperText?: string | null;
    options?: string[];
  },
  index: number
) {
  const options = (question.options || []).map((option) => option.trim()).filter(Boolean);

  return {
    id: question.id,
    title: question.title.trim(),
    description: question.description?.trim() || null,
    type: question.type,
    position: question.position ?? index,
    isRequired: Boolean(question.isRequired),
    placeholder: question.placeholder?.trim() || null,
    helperText: question.helperText?.trim() || null,
    options:
      question.type === "MULTIPLE_CHOICE" ||
      question.type === "CHECKBOXES" ||
      question.type === "DROPDOWN"
        ? options
        : [],
  };
}

export async function getAdminFormOverview(tenantId: string) {
  const now = new Date();
  const [forms, requiredUserAssignments] = await Promise.all([
    db.form.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            questions: true,
            assignments: true,
            responses: true,
          },
        },
        assignments: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            course: {
              select: { id: true, title: true },
            },
            space: {
              select: { id: true, name: true },
            },
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        responses: {
          orderBy: { updatedAt: "desc" },
          take: 5,
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    }),
    db.formAssignment.findMany({
      where: {
        tenantId,
        isActive: true,
        isRequired: true,
        audienceType: FormAssignmentAudienceType.USER,
        userId: { not: null },
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        form: {
          status: FormStatus.PUBLISHED,
        },
      },
      select: {
        formId: true,
        dueAt: true,
        responses: {
          where: {
            status: FormResponseStatus.SUBMITTED,
          },
          select: { id: true },
          take: 1,
        },
      },
    }),
  ]);

  const pendingByForm = new Map<string, { pendingRequired: number; overdueRequired: number }>();
  for (const assignment of requiredUserAssignments) {
    if (assignment.responses.length > 0) continue;
    const current = pendingByForm.get(assignment.formId) ?? {
      pendingRequired: 0,
      overdueRequired: 0,
    };
    current.pendingRequired += 1;
    if (assignment.dueAt && assignment.dueAt.getTime() < now.getTime()) {
      current.overdueRequired += 1;
    }
    pendingByForm.set(assignment.formId, current);
  }

  return forms.map((form) => ({
    ...form,
    pendingRequired: pendingByForm.get(form.id)?.pendingRequired ?? 0,
    overdueRequired: pendingByForm.get(form.id)?.overdueRequired ?? 0,
    assignments: form.assignments.map((assignment) => ({
      ...assignment,
      targetLabel:
        assignment.audienceType === "ROLE"
          ? assignment.audienceRole || "Rol"
          : assignment.audienceType === "COURSE"
            ? assignment.course?.title || "Cursus"
            : assignment.audienceType === "SPACE"
              ? assignment.space?.name || "Community"
              : assignment.user
                ? `${assignment.user.firstName} ${assignment.user.lastName}`.trim() ||
                  assignment.user.email
                : "Specifiek lid",
    })),
  }));
}

export async function getAdminFormBuilderData(formId: string, tenantId: string) {
  const [form, courses, spaces, users] = await Promise.all([
    db.form.findFirst({
      where: {
        id: formId,
        tenantId,
      },
      include: {
        questions: {
          orderBy: { position: "asc" },
        },
        assignments: {
          orderBy: { createdAt: "desc" },
        },
        responses: {
          orderBy: { updatedAt: "desc" },
          take: 20,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            assignment: {
              select: {
                id: true,
                title: true,
                audienceType: true,
                isRequired: true,
                dueAt: true,
              },
            },
            answers: {
              include: {
                question: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
              orderBy: {
                question: {
                  position: "asc",
                },
              },
            },
          },
        },
        _count: {
          select: {
            responses: true,
            assignments: true,
          },
        },
      },
    }),
    db.course.findMany({
      where: { isPublished: true },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, slug: true },
    }),
    db.space.findMany({
      orderBy: { position: "asc" },
      select: { id: true, name: true, slug: true, isActive: true },
    }),
    db.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    }),
  ]);

  if (!form) {
    return null;
  }

  return {
    form: {
      ...form,
      questions: form.questions.map((question) => ({
        ...question,
        options: parseQuestionOptions(question.options),
      })),
      responseStats: {
        totalResponses: form._count.responses,
        totalAssignments: form._count.assignments,
        submittedResponses: form.responses.filter(
          (response) => response.status === FormResponseStatus.SUBMITTED
        ).length,
      },
      responses: form.responses.map((response) => ({
        ...response,
        answerPreview: response.answers.slice(0, 3).map((answer) => ({
          questionTitle: answer.question.title,
          value: formatFormAnswerValue(answer.value),
        })),
      })),
    },
    audiences: {
      roles: [
        Role.CLIENT,
        Role.COACH,
        Role.SUPPORT,
        Role.STAFF,
        Role.ADMIN,
      ],
      courses,
      spaces,
      users,
    },
  };
}

export async function getActiveAssignmentsForUser(params: {
  userId: string;
  role: Role;
  tenantId: string | null | undefined;
}) {
  const { userId, role, tenantId } = params;
  if (!tenantId) return [];

  const [enrollments, memberships] = await Promise.all([
    db.enrollment.findMany({
      where: {
        userId,
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      select: {
        courseId: true,
      },
    }),
    db.spaceMember.findMany({
      where: { userId },
      select: {
        spaceId: true,
      },
    }),
  ]);

  const now = new Date();
  const courseIds = enrollments.map((enrollment) => enrollment.courseId);
  const spaceIds = memberships.map((membership) => membership.spaceId);

  return db.formAssignment.findMany({
    where: {
      tenantId,
      isActive: true,
      AND: [
        {
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        },
        {
          OR: [
            {
              audienceType: "ROLE",
              audienceRole: role,
            },
            {
              audienceType: "COURSE",
              courseId: { in: courseIds.length > 0 ? courseIds : ["__none__"] },
            },
            {
              audienceType: "SPACE",
              spaceId: { in: spaceIds.length > 0 ? spaceIds : ["__none__"] },
            },
            {
              audienceType: "USER",
              userId,
            },
          ],
        },
      ],
    },
    include: {
      form: {
        include: {
          questions: {
            orderBy: { position: "asc" },
          },
        },
      },
      responses: {
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: {
          answers: true,
        },
      },
    },
    orderBy: [{ isRequired: "desc" }, { createdAt: "desc" }],
  });
}

export async function getAssignedFormsForUser(params: {
  userId: string;
  role: Role;
  tenantId: string | null | undefined;
}) {
  const assignments = await getActiveAssignmentsForUser(params);

  return assignments
    .filter((assignment) => assignment.form.status === FormStatus.PUBLISHED)
    .map((assignment) => ({
      assignment,
      response: assignment.responses[0] || null,
      questionCount: assignment.form.questions.length,
      isSubmitted: assignment.responses[0]?.status === FormResponseStatus.SUBMITTED,
      isOverdue: Boolean(
        assignment.dueAt && assignment.responses[0]?.status !== FormResponseStatus.SUBMITTED
          ? assignment.dueAt.getTime() < Date.now()
          : false
      ),
    }));
}

export async function getAssignedFormForUserBySlug(params: {
  slug: string;
  userId: string;
  role: Role;
  tenantId: string | null | undefined;
}) {
  const assignments = await getAssignedFormsForUser(params);
  return assignments.find((entry) => entry.assignment.form.slug === params.slug) || null;
}

export type CourseAccessGate = {
  assignmentId: string;
  courseId: string;
  formTitle: string;
  formSlug: string;
  assignmentTitle: string | null;
};

/**
 * Verplichte cursusformulieren die nog niet zijn ingediend.
 * Dit is de centrale toegangspoort voor cursusinhoud en de gekoppelde community.
 */
export async function getBlockingCourseFormsForUser(params: {
  userId: string;
  courseIds: string[];
}) {
  if (params.courseIds.length === 0) return new Map<string, CourseAccessGate>();

  const assignments = await db.formAssignment.findMany({
    where: {
      audienceType: FormAssignmentAudienceType.COURSE,
      courseId: { in: params.courseIds },
      isActive: true,
      isRequired: true,
      blocksCourseAccess: true,
      OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
      form: { status: FormStatus.PUBLISHED },
      responses: {
        none: {
          userId: params.userId,
          status: FormResponseStatus.SUBMITTED,
        },
      },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      courseId: true,
      title: true,
      form: { select: { title: true, slug: true } },
    },
  });

  const byCourse = new Map<string, CourseAccessGate>();
  for (const assignment of assignments) {
    if (!assignment.courseId || byCourse.has(assignment.courseId)) continue;
    byCourse.set(assignment.courseId, {
      assignmentId: assignment.id,
      courseId: assignment.courseId,
      formTitle: assignment.form.title,
      formSlug: assignment.form.slug,
      assignmentTitle: assignment.title,
    });
  }
  return byCourse;
}

export async function getBlockingCourseFormForUser(userId: string, courseId: string) {
  const gates = await getBlockingCourseFormsForUser({ userId, courseIds: [courseId] });
  return gates.get(courseId) || null;
}

export async function upsertFormResponse(params: {
  tenantId: string;
  formId: string;
  assignmentId: string;
  userId: string;
  answers: Array<{ questionId: string; value: unknown }>;
  submit: boolean;
}) {
  const { tenantId, formId, assignmentId, userId, answers, submit } = params;

  const response = await db.formResponse.upsert({
    where: {
      formId_assignmentId_userId: {
        formId,
        assignmentId,
        userId,
      },
    },
    update: {
      status: submit ? FormResponseStatus.SUBMITTED : FormResponseStatus.IN_PROGRESS,
      submittedAt: submit ? new Date() : null,
    },
    create: {
      tenantId,
      formId,
      assignmentId,
      userId,
      status: submit ? FormResponseStatus.SUBMITTED : FormResponseStatus.IN_PROGRESS,
      submittedAt: submit ? new Date() : null,
    },
  });

  const validAnswers = answers.filter((answer) => answer.questionId);
  if (validAnswers.length > 0) {
    await db.$transaction(
      validAnswers.map((answer) =>
        db.formAnswer.upsert({
          where: {
            responseId_questionId: {
              responseId: response.id,
              questionId: answer.questionId,
            },
          },
          update: {
            value: answer.value as never,
          },
          create: {
            responseId: response.id,
            questionId: answer.questionId,
            value: answer.value as never,
          },
        })
      )
    );
  }

  return db.formResponse.findUnique({
    where: { id: response.id },
    include: {
      answers: true,
    },
  });
}
