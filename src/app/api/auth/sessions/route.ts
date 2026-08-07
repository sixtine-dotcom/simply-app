import { NextResponse } from "next/server";
import {
  createAuditLog,
  getCurrentUser,
  listUserSessions,
  revokeOtherSessions,
} from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const sessions = await listUserSessions(user.id);
    const securityAlerts = await db.notification.findMany({
      where: {
        userId: user.id,
        type: "security",
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      sessions,
      securityAlerts,
      limits: {
        maxDevices: 2,
      },
    });
  } catch (error) {
    console.error("List auth sessions error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const result = await revokeOtherSessions(user.id);
    await createAuditLog("auth.sessions.revoked_others", user.id, {
      count: result.count,
    });

    return NextResponse.json({ success: true, revoked: result.count });
  } catch (error) {
    console.error("Revoke other sessions error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
