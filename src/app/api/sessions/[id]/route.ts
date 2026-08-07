import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/auth";
import { getSession, updateSession } from "@/lib/coaching";
import { z } from "zod";

const updateSessionSchema = z.object({
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
  title: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  scheduledAt: z.string().datetime().optional(),
  duration: z.number().int().min(5).max(1440).optional(),
});

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

    const session = await getSession(id, user.id, user.tenantId);

    if (!session) {
      return NextResponse.json(
        { error: "Sessie niet gevonden" },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "COACH") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const session = await getSession(id, user.id, user.tenantId);
    if (!session) {
      return NextResponse.json({ error: "Sessie niet gevonden" }, { status: 404 });
    }

    if (user.role === "COACH" && session.coach.id !== user.id) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = updateSessionSchema.parse(await request.json());
    const updated = await updateSession(id, {
      status: body.status,
      title: body.title,
      description: body.description,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      duration: body.duration,
    });

    await createAuditLog(
      "session.updated",
      user.id,
      {
        sessionId: id,
        ...body,
      },
      undefined,
      user.tenantId
    );

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Update session error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
