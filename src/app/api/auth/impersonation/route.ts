import { NextResponse } from "next/server";
import { createAuditLog, getCurrentUser, stopImpersonation } from "@/lib/auth";

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user?.impersonation?.isActive) {
      return NextResponse.json({ error: "Geen actieve support-sessie" }, { status: 400 });
    }

    await createAuditLog(
      "platform.user.impersonation.stopped",
      user.impersonation.adminUserId,
      {
        targetUserId: user.id,
        targetEmail: user.email,
      },
      undefined,
      user.tenantId
    );

    await stopImpersonation();

    return NextResponse.json({ success: true, redirectTo: "/platform" });
  } catch (error) {
    console.error("Stop impersonation error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
