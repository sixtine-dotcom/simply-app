import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { id } = await params;

    await db.notification.updateMany({
      where: { id, userId: user.id },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Notification read error:", error);
    return NextResponse.json(
      { error: "Kon niet bijwerken" },
      { status: 500 }
    );
  }
}
