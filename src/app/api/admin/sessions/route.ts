import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { createSharedSessions } from "@/lib/coaching";
import { syncCoachingSessionsToConnectedCalendars } from "@/lib/calendar-sync";

const createSessionSchema = z.object({
  clientId: z.string().optional(),
  clientIds: z.array(z.string()).optional(),
  coachId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  externalAttendeeEmails: z.array(z.string().email()).optional(),
  scheduledAt: z.string().datetime(),
  duration: z.number().int().min(5).max(1440).default(45),
  autoRecord: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN" && user.role !== "COACH")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = await request.json();
    const data = createSessionSchema.parse({
      ...body,
      scheduledAt: body.scheduledAt,
      duration: parseInt(body.duration) || 45,
    });

    const coachId = user.role === "ADMIN" ? data.coachId || user.id : user.id;
    const clientIds = data.clientIds?.length ? data.clientIds : data.clientId ? [data.clientId] : [];

    const sessions = await createSharedSessions(coachId, clientIds, {
      title: data.title,
      description: data.description?.trim() || null,
      scheduledAt: new Date(data.scheduledAt),
      duration: data.duration,
      autoRecord: data.autoRecord ?? true,
      externalAttendeeEmails: Array.from(new Set(data.externalAttendeeEmails ?? [])),
    });

    await createAuditLog("session.created", user.id, {
      sessionIds: sessions.map((session) => session.id),
      clientIds,
      externalAttendeeEmails: data.externalAttendeeEmails ?? [],
      coachId,
    });

    await syncCoachingSessionsToConnectedCalendars(sessions.map((session) => session.id));

    return NextResponse.json({
      created: sessions.length,
      sessions,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Create session error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
