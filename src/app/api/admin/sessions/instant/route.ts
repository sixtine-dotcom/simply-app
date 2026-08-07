import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  title: z.string().optional(),
  autoRecord: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN" && user.role !== "COACH")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const data = schema.parse(await request.json().catch(() => ({})));
    const session = await db.coachingSession.create({
      data: {
        coachId: user.id,
        clientId: user.id,
        title: data.title?.trim() || "Vergadering",
        description: "Instant vergadering zonder externe deelnemers.",
        scheduledAt: new Date(),
        duration: 60,
        status: "scheduled",
        autoRecord: data.autoRecord,
        isInstant: true,
      },
      select: { id: true },
    });

    await createAuditLog("session.instant_created", user.id, {
      sessionId: session.id,
      autoRecord: data.autoRecord,
    });

    return NextResponse.json({ sessionId: session.id, roomHref: `/coaching/${session.id}/room` });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Create instant meeting error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
