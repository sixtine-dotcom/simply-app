import { db } from "./db";
import { createAuditLog } from "./auth";
import { getRecurringStarts, type RecurringScheduleMode } from "./recurring-schedule";

export interface SessionWithDetails {
  id: string;
  title: string | null;
  description: string | null;
  scheduledAt: Date;
  duration: number;
  status: string;
  roomId: string | null;
  roomUrl: string | null;
  autoRecord: boolean;
  isInstant: boolean;
  externalAttendeeEmails: string[];
  recurrenceOccurrenceKey: string | null;
  completedAt: Date | null;
  createdAt: Date;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    tenantId?: string | null;
  };
  coach: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    tenantId?: string | null;
  };
  notes: {
    id: string;
    content: string;
    isSharedWithClient: boolean;
    createdAt: Date;
  }[];
}

/**
 * Get sessions for a user (as client or coach)
 */
export async function getUserSessions(
  userId: string,
  role: "CLIENT" | "COACH" | "ADMIN",
  tenantId?: string | null,
  options: {
    status?: "scheduled" | "completed" | "cancelled" | "all";
    limit?: number;
  } = {}
): Promise<SessionWithDetails[]> {
  const { status = "all", limit } = options;

  const where: any = {};
  if (role === "CLIENT") {
    where.clientId = userId;
  } else if (role === "COACH" || role === "ADMIN") {
    if (role === "COACH") {
      where.coachId = userId;
    } else if (tenantId) {
      where.OR = [
        { client: { tenantId } },
        { coach: { tenantId } },
      ];
    } else {
      where.coachId = userId;
    }
  }

  if (status !== "all") {
    where.status = status;
  }

  const sessions = await db.coachingSession.findMany({
    where,
    orderBy: { scheduledAt: "desc" },
    take: limit,
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          tenantId: true,
        },
      },
      coach: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          tenantId: true,
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return sessions;
}

/**
 * Get a single session by ID
 */
export async function getSession(
  sessionId: string,
  userId: string,
  tenantId?: string | null
): Promise<SessionWithDetails | null> {
  const session = await db.coachingSession.findUnique({
    where: { id: sessionId },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          tenantId: true,
        },
      },
      coach: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          tenantId: true,
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!session) return null;

  // Check access
  if (session.clientId !== userId && session.coachId !== userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, tenantId: true },
    });
    if (user?.role !== "ADMIN") {
      return null;
    }
    const sessionTenantId = session.client.tenantId || session.coach.tenantId || null;
    if (tenantId && sessionTenantId !== tenantId) {
      return null;
    }
    if (user.tenantId && sessionTenantId && user.tenantId !== sessionTenantId) {
      return null;
    }
  }

  return session;
}

/**
 * Create a new coaching session
 */
export async function createSession(
  coachId: string,
  clientId: string,
  data: {
    title?: string;
    description?: string | null;
    scheduledAt: Date;
    duration?: number;
    recurrenceOccurrenceKey?: string | null;
    autoRecord?: boolean;
    isInstant?: boolean;
    externalAttendeeEmails?: string[];
  }
) {
  const [coach, client] = await Promise.all([
    db.user.findUnique({
      where: { id: coachId },
      select: { id: true, tenantId: true, role: true },
    }),
    db.user.findUnique({
      where: { id: clientId },
      select: { id: true, tenantId: true, role: true },
    }),
  ]);

  if (!coach || !client) {
    throw new Error("Coach of klant niet gevonden");
  }

  if (client.role !== "CLIENT") {
    throw new Error("Sessie kan alleen aan een klant gekoppeld worden");
  }

  if (coach.tenantId !== client.tenantId) {
    throw new Error("Coach en klant moeten binnen dezelfde tenant vallen");
  }

  return db.coachingSession.create({
    data: {
      coachId,
      clientId,
      title: data.title,
      description: data.description ?? null,
      scheduledAt: data.scheduledAt,
      duration: data.duration || 45,
      status: "scheduled",
      recurrenceOccurrenceKey: data.recurrenceOccurrenceKey ?? null,
      autoRecord: data.autoRecord ?? true,
      isInstant: data.isInstant ?? false,
      externalAttendeeEmails: data.externalAttendeeEmails ?? [],
    },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
      coach: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
  });
}

export async function createSharedSessions(
  coachId: string,
  clientIds: string[],
  data: {
    title?: string;
    description?: string | null;
    scheduledAt: Date;
    duration?: number;
    autoRecord?: boolean;
    externalAttendeeEmails?: string[];
  }
) {
  const uniqueClientIds = Array.from(new Set(clientIds)).filter(Boolean);
  if (uniqueClientIds.length === 0) {
    if (!data.externalAttendeeEmails?.length) {
      throw new Error("Selecteer minstens één klant of voeg een extern e-mailadres toe");
    }

    return [
      await db.coachingSession.create({
        data: {
          coachId,
          clientId: coachId,
          title: data.title,
          description: data.description ?? null,
          scheduledAt: data.scheduledAt,
          duration: data.duration || 45,
          status: "scheduled",
          autoRecord: data.autoRecord ?? true,
          externalAttendeeEmails: data.externalAttendeeEmails,
        },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          coach: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      }),
    ];
  }

  const occurrenceKey =
    uniqueClientIds.length > 1
      ? `manual-${coachId}-${data.scheduledAt.toISOString().slice(0, 16)}`
      : null;

  const sessions = [];
  for (const clientId of uniqueClientIds) {
    sessions.push(
      await createSession(coachId, clientId, {
        ...data,
        recurrenceOccurrenceKey: occurrenceKey,
        externalAttendeeEmails: data.externalAttendeeEmails ?? [],
      })
    );
  }

  return sessions;
}

/**
 * Get sessions with the same recurrence occurrence key (for group room sharing)
 */
export async function getSessionsByOccurrenceKey(key: string) {
  return db.coachingSession.findMany({
    where: { recurrenceOccurrenceKey: key },
    orderBy: { scheduledAt: "asc" },
  });
}

/**
 * Update room for all sessions sharing an occurrence key (group session)
 */
export async function updateSessionsRoomByOccurrenceKey(
  recurrenceOccurrenceKey: string,
  roomId: string,
  roomUrl: string
) {
  return db.coachingSession.updateMany({
    where: { recurrenceOccurrenceKey },
    data: { roomId, roomUrl },
  });
}

async function createSessionsForRecurringPlan(input: {
  coachId: string;
  courseId: string;
  clientIds: string[];
  title: string;
  description?: string | null;
  scheduleMode?: RecurringScheduleMode;
  dayOfWeek?: number;
  startTime: string;
  duration: number;
  startDate: Date;
  endDate: Date;
  customDates?: Date[];
  notBefore?: Date;
}) {
  if (input.clientIds.length === 0) {
    return { created: 0 };
  }

  const occurrenceDates = getRecurringStarts(input);
  const created: string[] = [];

  for (const scheduledAt of occurrenceDates) {
    if (input.notBefore && scheduledAt < input.notBefore) continue;
    const key = `recur-${input.courseId}-${scheduledAt.toISOString().slice(0, 16)}`;

    for (const clientId of input.clientIds) {
      const existing = await db.coachingSession.findFirst({
        where: {
          coachId: input.coachId,
          clientId,
          recurrenceOccurrenceKey: key,
        },
        select: { id: true },
      });

      if (existing) {
        continue;
      }

      const session = await db.coachingSession.create({
        data: {
          coachId: input.coachId,
          clientId,
          title: input.title,
          description: input.description ?? null,
          scheduledAt,
          duration: input.duration,
          status: "scheduled",
          recurrenceOccurrenceKey: key,
        },
      });
      created.push(session.id);
    }
  }

  return { created: created.length, sessionIds: created };
}

type StoredRecurringGroupPlan = {
  courseId: string;
  coachId: string;
  tenantId: string | null;
  title: string;
  description?: string | null;
  scheduleMode?: RecurringScheduleMode;
  dayOfWeek?: number;
  startTime: string;
  duration: number;
  startDate: string;
  endDate: string;
  customDates?: string[];
  isActive: boolean;
};

async function getStoredRecurringGroupPlans(courseId: string, tenantId?: string | null) {
  const logs = await db.auditLog.findMany({
    where: {
      action: "session.recurring_group_planned",
      tenantId: tenantId ?? null,
    },
    orderBy: { createdAt: "desc" },
  });

  return logs
    .map((log) => log.metadata as StoredRecurringGroupPlan | null)
    .filter((plan): plan is StoredRecurringGroupPlan => {
      return Boolean(
        plan &&
          plan.isActive &&
          plan.courseId === courseId &&
          typeof plan.coachId === "string" &&
          typeof plan.title === "string" &&
          typeof plan.startTime === "string" &&
          typeof plan.startDate === "string" &&
          typeof plan.endDate === "string"
      );
    });
}

/** Show saved group plans even before the first participant enrolls. Read-only. */
export async function getPlannedGroupOccurrences(input: {
  coachId: string;
  tenantId?: string | null;
  includeTenantPlans: boolean;
  start: Date;
  end: Date;
}) {
  const logs = await db.auditLog.findMany({
    where: { action: "session.recurring_group_planned", tenantId: input.tenantId ?? null },
    orderBy: { createdAt: "desc" },
  });
  const occurrences = new Map<string, { id: string; title: string; startsAt: Date; endsAt: Date; recurrenceOccurrenceKey: string }>();
  for (const log of logs) {
    const plan = log.metadata as StoredRecurringGroupPlan | null;
    if (!plan?.isActive || !plan.courseId || !plan.coachId || !plan.startTime || !plan.startDate || !plan.endDate) continue;
    if ((!input.includeTenantPlans || !input.tenantId) && plan.coachId !== input.coachId) continue;
    const startDate = new Date(plan.startDate);
    const endDate = new Date(plan.endDate);
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) continue;
    for (const startsAt of getRecurringStarts({ ...plan, startDate, endDate, customDates: (plan.customDates ?? []).map(date => new Date(date)) })) {
      const endsAt = new Date(startsAt.getTime() + plan.duration * 60000);
      if (startsAt > input.end || endsAt < input.start) continue;
      const key = `recur-${plan.courseId}-${startsAt.toISOString().slice(0, 16)}`;
      const id = `${plan.coachId}:${key}`;
      if (!occurrences.has(id)) occurrences.set(id, { id, title: plan.title, startsAt, endsAt, recurrenceOccurrenceKey: key });
    }
  }
  return Array.from(occurrences.values());
}

/**
 * Create recurring group coaching sessions: one session per (occurrence date × participant)
 * All sessions of the same occurrence share recurrenceOccurrenceKey so they use one video room.
 */
export async function createRecurringGroupSessions(
  coachId: string,
  courseId: string,
  tenantId: string | null | undefined,
  options: {
    title: string;
    description?: string | null;
    scheduleMode?: RecurringScheduleMode;
    dayOfWeek?: number; // 0 = zondag, 1 = maandag, ...
    startTime: string; // "19:30"
    duration: number;
    startDate: Date;
    endDate: Date;
    customDates?: Date[];
  }
) {
  const [coach, course] = await Promise.all([
    db.user.findUnique({
      where: { id: coachId },
      select: { id: true, tenantId: true, role: true },
    }),
    db.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    }),
  ]);

  if (!coach || !course) {
    throw new Error("Coach of cursus niet gevonden");
  }

  if (tenantId && coach.tenantId !== tenantId) {
    throw new Error("Coach valt niet binnen deze tenant");
  }

  await createAuditLog(
    "session.recurring_group_planned",
    coachId,
    {
      courseId,
      coachId,
      tenantId: tenantId ?? null,
      title: options.title,
      description: options.description ?? null,
      scheduleMode: options.scheduleMode ?? "weekly",
      dayOfWeek: options.dayOfWeek,
      startTime: options.startTime,
      duration: options.duration,
      startDate: options.startDate.toISOString(),
      endDate: options.endDate.toISOString(),
      customDates: options.customDates?.map((date) => date.toISOString()) ?? [],
      isActive: true,
    },
    undefined,
    tenantId
  );

  const enrollments = await db.enrollment.findMany({
    where: {
      courseId,
      user: tenantId ? { tenantId } : undefined,
      OR: [
        { endDate: { gt: new Date() } },
        { endDate: null },
      ],
    },
    include: {
      user: { select: { id: true } },
    },
  });
  const clientIds = enrollments.map((e) => e.user.id);
  const result = await createSessionsForRecurringPlan({
    coachId,
    courseId,
    clientIds,
    title: options.title,
    description: options.description ?? null,
    scheduleMode: options.scheduleMode ?? "weekly",
    dayOfWeek: options.dayOfWeek,
    startTime: options.startTime,
    duration: options.duration,
    startDate: options.startDate,
    endDate: options.endDate,
    customDates: options.customDates,
  });

  return {
    ...result,
    hasParticipants: clientIds.length > 0,
    message:
      clientIds.length > 0
        ? undefined
        : "Groepsreeks staat in je agenda. Er zijn nog geen deelnemers ingeschreven; zij krijgen hun sessies zodra ze toegang krijgen tot deze cursus.",
  };
}

export async function syncEnrollmentToRecurringGroupPlans(input: {
  userId: string;
  courseId: string;
}) {
  const now = new Date();
  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: input.userId,
        courseId: input.courseId,
      },
    },
    select: {
      courseId: true,
      userId: true,
      course: {
        select: {
          id: true,
          coachId: true,
        },
      },
      user: {
        select: {
          tenantId: true,
        },
      },
    },
  });

  if (!enrollment) {
    return { created: 0 };
  }

  const plans = await getStoredRecurringGroupPlans(
    input.courseId,
    enrollment.user.tenantId ?? null
  );

  let created = 0;
  const sessionIds: string[] = [];
  for (const plan of plans) {
    const planStartDate = new Date(plan.startDate);
    const planEndDate = new Date(plan.endDate);
    if (planEndDate < now) {
      continue;
    }

    const result = await createSessionsForRecurringPlan({
      coachId: plan.coachId,
      courseId: input.courseId,
      clientIds: [input.userId],
      title: plan.title,
      description: plan.description ?? null,
      scheduleMode: plan.scheduleMode ?? "weekly",
      dayOfWeek: plan.dayOfWeek,
      startTime: plan.startTime,
      duration: plan.duration,
      startDate: planStartDate,
      notBefore: now,
      endDate: planEndDate,
      customDates: (plan.customDates ?? []).map((date) => new Date(date)),
    });
    created += result.created;
    if ("sessionIds" in result) sessionIds.push(...(result.sessionIds ?? []));
  }

  if (sessionIds.length) {
    const { syncCoachingSessionsToConnectedCalendars } = await import("./calendar-sync");
    await syncCoachingSessionsToConnectedCalendars(sessionIds);
  }
  return { created };
}

/**
 * Update session room info (after Daily.co room creation)
 */
export async function updateSessionRoom(
  sessionId: string,
  roomId: string,
  roomUrl: string
) {
  return db.coachingSession.update({
    where: { id: sessionId },
    data: {
      roomId,
      roomUrl,
    },
  });
}

/**
 * Mark session as completed
 */
export async function completeSession(sessionId: string) {
  return db.coachingSession.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      completedAt: new Date(),
    },
  });
}

export async function updateSessionStatus(
  sessionId: string,
  status: "scheduled" | "completed" | "cancelled"
) {
  return db.coachingSession.update({
    where: { id: sessionId },
    data: {
      status,
      completedAt: status === "completed" ? new Date() : null,
    },
  });
}

export async function updateSession(
  sessionId: string,
  data: {
    title?: string | null;
    description?: string | null;
    scheduledAt?: Date;
    duration?: number;
    status?: "scheduled" | "completed" | "cancelled";
  }
) {
  return db.coachingSession.update({
    where: { id: sessionId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.scheduledAt ? { scheduledAt: data.scheduledAt } : {}),
      ...(data.duration !== undefined ? { duration: data.duration } : {}),
      ...(data.status
        ? {
            status: data.status,
            completedAt: data.status === "completed" ? new Date() : null,
          }
        : {}),
    },
  });
}

/**
 * Add a note to a session
 */
export async function addSessionNote(
  sessionId: string,
  content: string,
  isSharedWithClient: boolean = false
) {
  return db.sessionNote.create({
    data: {
      sessionId,
      content,
      isSharedWithClient,
    },
  });
}
