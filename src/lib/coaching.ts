import { db } from "./db";

export interface SessionWithDetails {
  id: string;
  title: string | null;
  scheduledAt: Date;
  duration: number;
  status: string;
  roomId: string | null;
  roomUrl: string | null;
  recurrenceOccurrenceKey: string | null;
  completedAt: Date | null;
  createdAt: Date;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  coach: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
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
    where.coachId = userId;
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
  userId: string
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
      select: { role: true },
    });
    if (user?.role !== "ADMIN") {
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
    scheduledAt: Date;
    duration?: number;
    recurrenceOccurrenceKey?: string | null;
  }
) {
  return db.coachingSession.create({
    data: {
      coachId,
      clientId,
      title: data.title,
      scheduledAt: data.scheduledAt,
      duration: data.duration || 45,
      status: "scheduled",
      recurrenceOccurrenceKey: data.recurrenceOccurrenceKey ?? null,
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

/**
 * Generate dates for a recurring schedule: same day of week between start and end
 */
function getOccurrenceDates(
  dayOfWeek: number,
  startDate: Date,
  endDate: Date
): Date[] {
  const dates: Date[] = [];
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // First occurrence on or after startDate with correct day
  let d = new Date(start);
  const startDay = start.getDay();
  let diff = dayOfWeek - startDay;
  if (diff < 0) diff += 7;
  if (diff > 0) d.setDate(d.getDate() + diff);
  else if (startDay !== dayOfWeek) d.setDate(d.getDate() + 7);

  while (d <= end) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return dates;
}

/**
 * Create recurring group coaching sessions: one session per (occurrence date × participant)
 * All sessions of the same occurrence share recurrenceOccurrenceKey so they use one video room.
 */
export async function createRecurringGroupSessions(
  coachId: string,
  courseId: string,
  options: {
    title: string;
    dayOfWeek: number; // 0 = zondag, 1 = maandag, ...
    startTime: string; // "19:30"
    duration: number;
    startDate: Date;
    endDate: Date;
  }
) {
  const enrollments = await db.enrollment.findMany({
    where: {
      courseId,
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
  if (clientIds.length === 0) {
    return { created: 0, message: "Geen actieve deelnemers in deze cursus." };
  }

  const occurrenceDates = getOccurrenceDates(
    options.dayOfWeek,
    options.startDate,
    options.endDate
  );
  const [hours, minutes] = options.startTime.split(":").map(Number);

  const created: string[] = [];
  for (const date of occurrenceDates) {
    const scheduledAt = new Date(date);
    scheduledAt.setHours(hours, minutes, 0, 0);
    const key = `recur-${courseId}-${scheduledAt.toISOString().slice(0, 16)}`;
    for (const clientId of clientIds) {
      const session = await db.coachingSession.create({
        data: {
          coachId,
          clientId,
          title: options.title,
          scheduledAt,
          duration: options.duration,
          status: "scheduled",
          recurrenceOccurrenceKey: key,
        },
      });
      created.push(session.id);
    }
  }
  return { created: created.length, sessionIds: created };
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
