import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { createRecurringGroupSessions } from "@/lib/coaching";
import { syncCoachingSessionsToConnectedCalendars } from "@/lib/calendar-sync";

const schema = z.object({
  courseId: z.string().min(1, "Cursus is verplicht"),
  title: z.string().min(1, "Titel is verplicht"),
  description: z.string().optional(),
  scheduleMode: z.enum(["weekly", "biweekly", "monthly", "custom"]).default("weekly"),
  dayOfWeek: z.number().int().min(0).max(6).optional(), // 0 = zondag, 1 = maandag
  startTime: z.string().regex(/^\d{1,2}:\d{2}$/, "Tijd formaat: HH:MM"),
  duration: z.number().int().min(5).max(1440).default(60),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  customDates: z.array(z.string().min(1)).default([]),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN" && user.role !== "COACH")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = schema.safeParse({
      ...body,
      dayOfWeek: body.dayOfWeek != null ? Number(body.dayOfWeek) : undefined,
      duration: body.duration != null ? Number(body.duration) : 60,
      customDates: Array.isArray(body.customDates) ? body.customDates : [],
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    // Parse as local date (YYYY-MM-DD)
    const startDate = new Date(data.startDate + "T00:00:00");
    const endDate = new Date(data.endDate + "T23:59:59");

    if (endDate < startDate) {
      return NextResponse.json(
        { error: "Einddatum moet na startdatum liggen" },
        { status: 400 }
      );
    }

    const customDates = data.customDates
      .map((date) => new Date(date + "T00:00:00"))
      .filter((date) => !Number.isNaN(date.getTime()));

    if (data.scheduleMode === "custom" && customDates.length === 0) {
      return NextResponse.json(
        { error: "Voeg minstens één flexibele datum toe" },
        { status: 400 }
      );
    }

    const result = await createRecurringGroupSessions(
      user.id,
      data.courseId,
      user.tenantId,
      {
        title: data.title,
        description: data.description?.trim() || null,
        scheduleMode: data.scheduleMode,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        duration: data.duration,
        startDate,
        endDate,
        customDates,
      }
    );

    await createAuditLog("session.recurring_group_created", user.id, {
      courseId: data.courseId,
      created: result.created,
    });

    if ("sessionIds" in result && Array.isArray(result.sessionIds)) {
      await syncCoachingSessionsToConnectedCalendars(result.sessionIds);
    }

    return NextResponse.json({
      created: result.created,
      message:
        "message" in result && result.message
          ? result.message
          : `${result.created} groepsessies ingepland.`,
    });
  } catch (error) {
    console.error("Recurring group sessions error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
