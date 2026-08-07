import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  connectCalendarProvider,
  isCalendarProvider,
  syncExternalCalendarEvents,
  syncUpcomingCoachingSessionsForUser,
} from "@/lib/calendar-sync";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN" && user.role !== "COACH")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { provider } = await params;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!isCalendarProvider(provider) || !code) {
    return NextResponse.redirect(new URL("/admin/sessions?calendar=failed", request.url));
  }

  try {
    await connectCalendarProvider({ userId: user.id, provider, code });
    await syncExternalCalendarEvents(user.id);
    await syncUpcomingCoachingSessionsForUser(user.id);
    let returnTo = "/admin/sessions?calendar=connected";
    if (state) {
      try {
        const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
        if (typeof parsed.returnTo === "string" && parsed.returnTo.startsWith("/admin/")) {
          returnTo = parsed.returnTo;
        }
      } catch {
        // Older OAuth states did not contain a return path.
      }
    }
    return NextResponse.redirect(new URL(returnTo, request.url));
  } catch (error) {
    console.error("Calendar callback error:", error);
    return NextResponse.redirect(new URL("/admin/sessions?calendar=failed", request.url));
  }
}
