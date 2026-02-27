import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserSessions } from "@/lib/coaching";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as
      | "scheduled"
      | "completed"
      | "cancelled"
      | null;
    const limit = parseInt(searchParams.get("limit") || "50");

    const sessions = await getUserSessions(
      user.id,
      user.role as "CLIENT" | "COACH" | "ADMIN",
      {
        status: status || "all",
        limit,
      }
    );

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Get sessions error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
