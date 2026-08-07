import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId, feedback, note } = await req.json();
    if (!messageId || !["positive", "negative"].includes(feedback)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const message = await db.aiMessage.findFirst({
      where: { id: messageId, conversation: { userId: user.id } },
    });

    if (!message) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.aiMessage.update({
      where: { id: messageId },
      data: { feedback, feedbackNote: note || null },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
