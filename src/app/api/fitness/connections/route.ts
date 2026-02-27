import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isStravaConfigured } from "@/lib/strava";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const connections = await db.fitnessConnection.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        provider: true,
        providerUserId: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const providers = [
      {
        id: "strava",
        name: "Strava",
        description: "Garmin, Fitbit, Polar, Apple Watch sync vaak met Strava",
        connected: connections.some((c) => c.provider === "strava"),
        configured: isStravaConfigured(),
      },
      {
        id: "fitbit",
        name: "Fitbit",
        description: "Komt binnenkort",
        connected: false,
        configured: false,
      },
      {
        id: "garmin",
        name: "Garmin Connect",
        description: "Komt binnenkort",
        connected: false,
        configured: false,
      },
      {
        id: "polar",
        name: "Polar",
        description: "Komt binnenkort",
        connected: false,
        configured: false,
      },
    ].map((p) => ({
      ...p,
      connection: connections.find((c) => c.provider === p.id) ?? null,
    }));

    return NextResponse.json({ connections, providers });
  } catch (error) {
    console.error("Fitness connections error:", error);
    return NextResponse.json(
      { error: "Kon verbindingen niet laden" },
      { status: 500 }
    );
  }
}
