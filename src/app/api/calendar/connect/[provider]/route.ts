import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getCalendarAuthorizationUrl,
  isCalendarProvider,
} from "@/lib/calendar-sync";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const requestedReturnTo = request.nextUrl.searchParams.get("returnTo") || "";
  const safeReturnTo = requestedReturnTo.startsWith("/admin/")
    ? requestedReturnTo
    : "/admin/sessions";
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN" && user.role !== "COACH")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { provider } = await params;
  if (!isCalendarProvider(provider)) {
    return NextResponse.json({ error: "Onbekende agenda provider" }, { status: 400 });
  }

  try {
    const state = Buffer.from(JSON.stringify({ userId: user.id, at: Date.now(), returnTo: safeReturnTo })).toString("base64url");
    return NextResponse.redirect(getCalendarAuthorizationUrl(provider, state));
  } catch (error) {
    console.error("Calendar connect error:", error);
    const fallback = new URL(safeReturnTo, request.url);
    fallback.searchParams.set(provider === "google" ? "google" : "calendar", "not-configured");
    return NextResponse.redirect(fallback);
  }
}
