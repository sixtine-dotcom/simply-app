import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { createSession } from "@/lib/coaching";

const createSessionSchema = z.object({
  clientId: z.string().min(1, "Klant is verplicht"),
  title: z.string().optional(),
  scheduledAt: z.string().datetime(),
  duration: z.number().min(15).max(180).default(45),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "ADMIN" && user.role !== "COACH")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = await request.json();
    const data = createSessionSchema.parse({
      ...body,
      scheduledAt: body.scheduledAt,
      duration: parseInt(body.duration) || 45,
    });

    const session = await createSession(
      user.id, // Coach is the current user
      data.clientId,
      {
        title: data.title,
        scheduledAt: new Date(data.scheduledAt),
        duration: data.duration,
      }
    );

    await createAuditLog("session.created", user.id, {
      sessionId: session.id,
      clientId: data.clientId,
    });

    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Create session error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
