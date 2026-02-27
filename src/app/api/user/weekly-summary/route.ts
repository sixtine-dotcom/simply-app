import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getLatestWeeklySummary,
  getWeeklySummaryByWeek,
  computeWeeklyHighlights,
  upsertWeeklySummary,
  getWeekBoundsForDate,
} from "@/lib/weekly-summary";

/** GET: laatste weekoverzicht of voor specifieke week (query: weekStart=YYYY-MM-DD) */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekStartParam = searchParams.get("weekStart");

    if (weekStartParam) {
      const weekStart = new Date(weekStartParam);
      if (isNaN(weekStart.getTime())) {
        return NextResponse.json(
          { error: "Ongeldige weekStart (gebruik YYYY-MM-DD)" },
          { status: 400 }
        );
      }
      let summary = await getWeeklySummaryByWeek(user.id, weekStart);
      if (!summary) {
        const highlights = await computeWeeklyHighlights(user.id, weekStart);
        summary = await upsertWeeklySummary(user.id, weekStart, highlights);
      }
      const bounds = getWeekBoundsForDate(weekStart);
      return NextResponse.json({
        summary,
        weekStart: bounds.weekStart.toISOString().slice(0, 10),
        weekEnd: bounds.weekEnd.toISOString().slice(0, 10),
      });
    }

    const summary = await getLatestWeeklySummary(user.id);
    if (!summary) {
      return NextResponse.json({
        summary: null,
        message: "Nog geen weekoverzicht. Aan het einde van de week ontvang je een overzicht.",
      });
    }
    const bounds = getWeekBoundsForDate(summary.weekStart);
    return NextResponse.json({
      summary,
      weekStart: bounds.weekStart.toISOString().slice(0, 10),
      weekEnd: bounds.weekEnd.toISOString().slice(0, 10),
    });
  } catch (error) {
    console.error("Get weekly summary error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
