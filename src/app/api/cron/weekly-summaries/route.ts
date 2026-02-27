import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getWeekBoundsForDate,
  getPreviousWeekStart,
  computeWeeklyHighlights,
  upsertWeeklySummary,
  type WeeklyHighlights,
} from "@/lib/weekly-summary";
import { sendWeeklySummaryEmail } from "@/lib/email";

/** Cron: zondagavond uitvoeren. Genereert weekoverzicht voor afgelopen week voor alle CLIENT-gebruikers, stuurt notificatie + email. */
export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get("secret");
    const expected = process.env.CRON_SECRET;
    if (expected && secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const { weekStart } = getWeekBoundsForDate(now);
    const prevWeekStart = getPreviousWeekStart(weekStart);
    const bounds = getWeekBoundsForDate(prevWeekStart);
    const weekStartDate = bounds.weekStart;
    const weekEndDate = bounds.weekEnd;

    const clients = await db.user.findMany({
      where: { role: "CLIENT", deletedAt: null },
      select: { id: true, email: true, firstName: true },
    });

    let generated = 0;
    let notified = 0;
    let emailed = 0;

    for (const user of clients) {
      try {
        const highlights = await computeWeeklyHighlights(user.id, weekStartDate);
        await upsertWeeklySummary(user.id, weekStartDate, highlights);

        const since = new Date(now);
        since.setHours(since.getHours() - 24);
        const existingNotif = await db.notification.findFirst({
          where: {
            userId: user.id,
            type: "weekly_summary",
            createdAt: { gte: since },
          },
        });
        if (!existingNotif) {
          const title = "Je weekoverzicht is klaar";
          const body = buildSummarySnippet(highlights);
          await db.notification.create({
            data: {
              userId: user.id,
              type: "weekly_summary",
              title,
              body,
              link: "/trackers/weekly-overview",
            },
          });
          notified++;
        }

        const emailResult = await sendWeeklySummaryEmail(
          user.email,
          user.firstName,
          weekStartDate,
          weekEndDate,
          highlights
        );
        if (emailResult.success) emailed++;
      } catch (err) {
        console.error(`Weekly summary failed for user ${user.id}:`, err);
      }
      generated++;
    }

    return NextResponse.json({
      ok: true,
      weekStart: weekStartDate.toISOString().slice(0, 10),
      weekEnd: weekEndDate.toISOString().slice(0, 10),
      usersProcessed: clients.length,
      generated,
      notified,
      emailed,
    });
  } catch (error) {
    console.error("Weekly summaries cron error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

function formatWeekRange(start: Date, end: Date): string {
  return `${start.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}`;
}

function buildSummarySnippet(h: WeeklyHighlights): string {
  const parts: string[] = [];
  if (h.stepsDelta > 0) parts.push(`${h.stepsDelta.toLocaleString("nl-NL")} stappen meer dan vorige week`);
  if (h.weightDelta != null && h.weightDelta > 0) parts.push(`${h.weightDelta} kg minder dan vorige week`);
  if (h.workoutsCount > 0) parts.push(`${h.workoutsCount} workout(s)`);
  if (h.lessonsCompleted > 0) parts.push(`${h.lessonsCompleted} les(sen) afgerond`);
  if (h.recipeTitles.length > 0) parts.push(`${h.recipeTitles.length} recept(en) gepland`);
  if (h.postsCount > 0 || h.commentsCount > 0) parts.push("actief in de community");
  return parts.length > 0 ? parts.join(" · ") : "Bekijk je voortgang in de app.";
}
