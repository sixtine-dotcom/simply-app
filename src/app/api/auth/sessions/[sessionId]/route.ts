import { NextRequest, NextResponse } from "next/server";
import { createAuditLog, getCurrentUser, revokeSessionById } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { sessionId } = await params;
    const result = await revokeSessionById(user.id, sessionId);
    if (result.count === 0) {
      return NextResponse.json({ error: "Sessie niet gevonden" }, { status: 404 });
    }

    await createAuditLog("auth.session.revoked", user.id, { sessionId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke session error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
