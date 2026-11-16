import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCoachingCalendarToken, generateCoachingCalendar, readCoachingCalendarToken } from "@/lib/coaching-calendar";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    let identity: { userId: string; tenantId: string | null };
    if (token) {
      const parsed = readCoachingCalendarToken(token);
      if (!parsed) return NextResponse.json({ error: "Ongeldige agendalink" }, { status: 401 });
      identity = parsed;
    } else {
      const user = await getCurrentUser();
      if (!user) return NextResponse.json({ error: "Log opnieuw in om je agenda toe te voegen." }, { status: 401 });
      if (user.role !== "CLIENT") return NextResponse.json({ error: "Deze agenda is voor klanten." }, { status: 403 });
      identity = { userId: user.id, tenantId: user.tenantId };
    }

    const user = await db.user.findFirst({
      where: { id: identity.userId, tenantId: identity.tenantId, role: "CLIENT", deletedAt: null },
      select: { id: true, tenant: { select: { status: true } } },
    });
    if (!user || user.tenant?.status === "SUSPENDED") {
      return NextResponse.json({ error: "Agenda niet beschikbaar" }, { status: 404 });
    }

    if (!token && request.nextUrl.searchParams.get("format") === "links") {
      const feed = new URL("/api/sessions/calendar", request.nextUrl.origin);
      feed.searchParams.set("token", createCoachingCalendarToken(identity.userId, identity.tenantId));
      return NextResponse.json({ feedUrl: feed.toString() }, { headers: { "Cache-Control": "private, no-store" } });
    }

    // No list-page limit: export every session belonging to this client.
    // Retain cancelled entries so subscriptions can remove old appointments.
    const sessions = await db.coachingSession.findMany({
      where: { clientId: user.id, status: { in: ["scheduled", "completed", "cancelled"] } },
      orderBy: { scheduledAt: "asc" },
      select: { id: true, title: true, description: true, scheduledAt: true, duration: true, status: true, updatedAt: true },
    });
    const download = request.nextUrl.searchParams.get("download") === "1";
    return new Response(generateCoachingCalendar(sessions, request.nextUrl.origin), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="simply-coachingsessies.ics"`,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Coaching calendar failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Je agenda kon niet worden geladen. Probeer het opnieuw." }, { status: 500 });
  }
}
