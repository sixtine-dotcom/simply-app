import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  syncExternalCalendarEvents,
  syncUpcomingCoachingSessionsForUser,
} from "@/lib/calendar-sync";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN" && user.role !== "COACH")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await syncExternalCalendarEvents(user.id);
    await syncUpcomingCoachingSessionsForUser(user.id);
    return NextResponse.redirect(new URL("/admin/sessions?calendar=synced", request.url));
  } catch (error) {
    console.error("Calendar sync error:", error);
    return NextResponse.redirect(new URL("/admin/sessions?calendar=sync-failed", request.url));
  }
}
