import {
  FormAssignmentAudienceType,
  FormQuestionType,
  FormResponseStatus,
  FormStatus,
  Role,
} from "@prisma/client";
import { db } from "@/lib/db";
import { CONTACT_INFO_FIELDS, getContactInfoFields, getQuestionAnswerError, FormAnswerValidationError } from "@/lib/form-fields";

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
    const contact = CONTACT_INFO_FIELDS.filter((field) => typeof (value as Record<string, unknown>)[field.key] === "string");
    if (contact.length) return contact.map((field) => `${field.label}: ${(value as Record<string, string>)[field.key]}`).join("\n");
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
      question.type === "CONTACT_INFO"
        ? getContactInfoFields(options).map((field) => field.key)
        : question.type === "MULTIPLE_CHOICE" ||
      question.type === "CHECKBOXES" ||
      question.type === "DROPDOWN" || question.type === "FILE_UPLOAD"
        ? options
        : [],
  };
}

export async function getAdminFormOverview(tenantId: string) {
  const now = new Date();
  const [forms, audienceProgress] = await Promise.all([
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
      },
    }),
    getFormAudienceProgress(tenantId),
  ]);

  return forms.map((form) => ({
    ...form,
    participantProgress: audienceProgress.get(form.id) ?? emptyAudienceProgress(),
    pendingRequired: audienceProgress.get(form.id)?.pendingRequired ?? 0,
    overdueRequired: audienceProgress.get(form.id)?.overdueRequired ?? 0,
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

type AudienceMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

function emptyAudienceProgress() {
  return {
    total: 0,
    completed: 0,
    pending: 0,
    completionRate: 0,
    pendingRequired: 0,
    overdueRequired: 0,
    participants: [] as Array<AudienceMember & { submitted: boolean; overdue: boolean }>,
  };
}

export async function getFormAudienceProgress(tenantId: string, formIds?: string[]) {
  const now = new Date();
  const assignments = await db.formAssignment.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(formIds?.length ? { formId: { in: formIds } } : {}),
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
    },
    select: {
      formId: true,
      audienceType: true,
      audienceRole: true,
      courseId: true,
      spaceId: true,
      userId: true,
      isRequired: true,
      dueAt: true,
    },
  });

  const courseIds = Array.from(new Set(assignments.flatMap((item) => (item.courseId ? [item.courseId] : []))));
  const spaceIds = Array.from(new Set(assignments.flatMap((item) => (item.spaceId ? [item.spaceId] : []))));
  const directUserIds = Array.from(new Set(assignments.flatMap((item) => (item.userId ? [item.userId] : []))));
  const roles = Array.from(new Set(assignments.flatMap((item) => (item.audienceRole ? [item.audienceRole] : []))));

  const [enrollments, memberships, users, responses] = await Promise.all([
    courseIds.length
      ? db.enrollment.findMany({
          where: { courseId: { in: courseIds }, user: { tenantId, deletedAt: null } },
          select: {
            courseId: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        })
      : [],
    spaceIds.length
      ? db.spaceMember.findMany({
          where: { spaceId: { in: spaceIds }, user: { tenantId, deletedAt: null } },
          select: {
            spaceId: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        })
      : [],
    directUserIds.length || roles.length
      ? db.user.findMany({
          where: {
            tenantId,
            deletedAt: null,
            OR: [
              ...(directUserIds.length ? [{ id: { in: directUserIds } }] : []),
              ...(roles.length ? [{ role: { in: roles } }] : []),
            ],
          },
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        })
      : [],
    db.formResponse.findMany({
      where: {
        tenantId,
        status: FormResponseStatus.SUBMITTED,
        ...(formIds?.length ? { formId: { in: formIds } } : {}),
      },
      select: { formId: true, userId: true },
    }),
  ]);

  const courseMembers = new Map<string, AudienceMember[]>();
  for (const item of enrollments) {
    courseMembers.set(item.courseId, [...(courseMembers.get(item.courseId) ?? []), item.user]);
  }
  const spaceMembers = new Map<string, AudienceMember[]>();
  for (const item of memberships) {
    spaceMembers.set(item.spaceId, [...(spaceMembers.get(item.spaceId) ?? []), item.user]);
  }
  const usersById = new Map(users.map((user) => [user.id, user]));
  const usersByRole = new Map<Role, AudienceMember[]>();
  for (const user of users) {
    usersByRole.set(user.role, [...(usersByRole.get(user.role) ?? []), user]);
  }
  const submitted = new Set(responses.map((response) => `${response.formId}:${response.userId}`));
  const membersByForm = new Map<string, Map<string, AudienceMember & { required: boolean; dueAt: Date | null }>>();

  for (const assignment of assignments) {
    const members =
      assignment.audienceType === FormAssignmentAudienceType.COURSE && assignment.courseId
        ? courseMembers.get(assignment.courseId) ?? []
        : assignment.audienceType === FormAssignmentAudienceType.SPACE && assignment.spaceId
          ? spaceMembers.get(assignment.spaceId) ?? []
          : assignment.audienceType === FormAssignmentAudienceType.USER && assignment.userId
            ? usersById.get(assignment.userId)
              ? [usersById.get(assignment.userId)!]
              : []
            : assignment.audienceType === FormAssignmentAudienceType.ROLE && assignment.audienceRole
              ? usersByRole.get(assignment.audienceRole) ?? []
              : [];
    const formMembers = membersByForm.get(assignment.formId) ?? new Map();
    for (const member of members) {
      const current = formMembers.get(member.id);
      formMembers.set(member.id, {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        required: Boolean(current?.required || assignment.isRequired),
        dueAt:
          !current?.dueAt || (assignment.dueAt && assignment.dueAt < current.dueAt)
            ? assignment.dueAt
            : current.dueAt,
      });
    }
    membersByForm.set(assignment.formId, formMembers);
  }

  const result = new Map<string, ReturnType<typeof emptyAudienceProgress>>();
  for (const [formId, members] of Array.from(membersByForm.entries())) {
    const participants = Array.from(members.values())
      .map((member) => {
        const isSubmitted = submitted.has(`${formId}:${member.id}`);
        return {
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          submitted: isSubmitted,
          overdue: Boolean(member.required && !isSubmitted && member.dueAt && member.dueAt < now),
          required: member.required,
        };
      })
      .sort((a, b) => Number(a.submitted) - Number(b.submitted) || a.firstName.localeCompare(b.firstName));
    const completed = participants.filter((participant) => participant.submitted).length;
    result.set(formId, {
      total: participants.length,
      completed,
      pending: participants.length - completed,
      completionRate: participants.length ? Math.round((completed / participants.length) * 100) : 0,
      pendingRequired: participants.filter((participant) => participant.required && !participant.submitted).length,
      overdueRequired: participants.filter((participant) => participant.overdue).length,
      participants,
    });
  }
  return result;
}

export async function getAdminFormBuilderData(formId: string, tenantId: string) {
  const [form, courses, spaces, users, audienceProgress] = await Promise.all([
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
    getFormAudienceProgress(tenantId, [formId]),
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
        totalAssignments: audienceProgress.get(formId)?.total ?? 0,
        submittedResponses: audienceProgress.get(formId)?.completed ?? 0,
      },
      participantProgress: audienceProgress.get(formId) ?? emptyAudienceProgress(),
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

  const questions = await db.formQuestion.findMany({ where: { formId, form: { tenantId } }, orderBy: { position: "asc" } });
  const questionIds = new Set(questions.map((question) => question.id));
  if (answers.some((answer) => !questionIds.has(answer.questionId))) throw new FormAnswerValidationError("Een antwoord hoort niet bij dit formulier.");
  if (submit) {
    const values = new Map(answers.map((answer) => [answer.questionId, answer.value]));
    for (const question of questions) {
      const error = getQuestionAnswerError({ ...question, options: parseQuestionOptions(question.options) }, values.get(question.id));
      if (error) throw new FormAnswerValidationError(`${question.title}: ${error}`);
    }
  }

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
