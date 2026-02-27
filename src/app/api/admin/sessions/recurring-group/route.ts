import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { createRecurringGroupSessions } from "@/lib/coaching";

const schema = z.object({
  courseId: z.string().min(1, "Cursus is verplicht"),
  title: z.string().min(1, "Titel is verplicht"),
  dayOfWeek: z.number().int().min(0).max(6), // 0 = zondag, 1 = maandag
  startTime: z.string().regex(/^\d{1,2}:\d{2}$/, "Tijd formaat: HH:MM"),
  duration: z.number().int().min(15).max(180).default(60),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "ADMIN" && user.role !== "COACH")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = schema.safeParse({
      ...body,
      dayOfWeek: body.dayOfWeek != null ? Number(body.dayOfWeek) : undefined,
      duration: body.duration != null ? Number(body.duration) : 60,
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

    const result = await createRecurringGroupSessions(
      user.id,
      data.courseId,
      {
        title: data.title,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        duration: data.duration,
        startDate,
        endDate,
      }
    );

    if (typeof result.created === "number" && result.created === 0 && "message" in result) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    await createAuditLog("session.recurring_group_created", user.id, {
      courseId: data.courseId,
      created: result.created,
    });

    return NextResponse.json({
      created: result.created,
      message: `${result.created} groepsessies ingepland.`,
    });
  } catch (error) {
    console.error("Recurring group sessions error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
