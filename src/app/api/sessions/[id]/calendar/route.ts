import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSession } from "@/lib/coaching";
import { generateSessionICS } from "@/lib/calendar";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const session = await getSession(id, user.id);

    if (!session) {
      return NextResponse.json(
        { error: "Sessie niet gevonden" },
        { status: 404 }
      );
    }

    // Get full user details for calendar
    const [coach, client] = await Promise.all([
      db.user.findUnique({
        where: { id: session.coach.id },
        select: { email: true },
      }),
      db.user.findUnique({
        where: { id: session.client.id },
        select: { email: true },
      }),
    ]);

    if (!coach || !client) {
      return NextResponse.json(
        { error: "Gebruiker niet gevonden" },
        { status: 404 }
      );
    }

    const ics = generateSessionICS({
      id: session.id,
      title: session.title,
      scheduledAt: session.scheduledAt,
      duration: session.duration,
      coach: {
        ...session.coach,
        email: coach.email,
      },
      client: {
        ...session.client,
        email: client.email,
      },
    });

    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="coaching-${session.id}.ics"`,
      },
    });
  } catch (error) {
    console.error("Get calendar error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
