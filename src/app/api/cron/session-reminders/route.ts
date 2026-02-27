import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const REMINDER_MINUTES_BEFORE = 75; // 1u15
const WINDOW_MINUTES = 10; // run every 10 min, catch sessions in [75, 85] min from now

export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get("secret");
    const expected = process.env.CRON_SECRET;
    if (expected && secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const from = new Date(
      now.getTime() + (REMINDER_MINUTES_BEFORE - WINDOW_MINUTES) * 60 * 1000
    );
    const to = new Date(
      now.getTime() + (REMINDER_MINUTES_BEFORE + WINDOW_MINUTES) * 60 * 1000
    );

    const sessions = await db.coachingSession.findMany({
      where: {
        status: "scheduled",
        scheduledAt: { gte: from, lte: to },
      },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    let sent = 0;
    for (const session of sessions) {
      const existing = await db.notification.findFirst({
        where: {
          sessionId: session.id,
          type: "session_reminder",
        },
      });
      if (existing) continue;

      const startAt = new Date(session.scheduledAt);
      const timeStr = startAt.toLocaleTimeString("nl-NL", {
        hour: "2-digit",
        minute: "2-digit",
      });

      await db.notification.create({
        data: {
          userId: session.clientId,
          type: "session_reminder",
          title: "Herinnering: coaching over 1 uur",
          body: `Je groepscoaching start om ${timeStr}. Open de app om deel te nemen.`,
          link: `/coaching/${session.id}`,
          sessionId: session.id,
        },
      });
      sent++;
    }

    return NextResponse.json({
      ok: true,
      checked: sessions.length,
      sent,
    });
  } catch (error) {
    console.error("Session reminders cron error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
