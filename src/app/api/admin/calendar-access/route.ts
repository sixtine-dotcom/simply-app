import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  audienceType: z.enum(["course", "user"]),
  courseId: z.string().optional(),
  userId: z.string().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN" && user.role !== "COACH")) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const rules = await db.coachCalendarAccess.findMany({
    where: { coachId: user.id, isActive: true },
    include: {
      course: { select: { id: true, title: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rules);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN" && user.role !== "COACH")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const data = schema.parse(await request.json());
    if (data.audienceType === "course" && !data.courseId) {
      return NextResponse.json({ error: "Selecteer een cursusgroep" }, { status: 400 });
    }
    if (data.audienceType === "user" && !data.userId) {
      return NextResponse.json({ error: "Selecteer een klant" }, { status: 400 });
    }

    const existing = await db.coachCalendarAccess.findFirst({
      where: {
        coachId: user.id,
        audienceType: data.audienceType,
        courseId: data.audienceType === "course" ? data.courseId : null,
        userId: data.audienceType === "user" ? data.userId : null,
      },
    });

    const rule = existing
      ? await db.coachCalendarAccess.update({
          where: { id: existing.id },
          data: { isActive: true },
        })
      : await db.coachCalendarAccess.create({
          data: {
        coachId: user.id,
        audienceType: data.audienceType,
        courseId: data.audienceType === "course" ? data.courseId : null,
        userId: data.audienceType === "user" ? data.userId : null,
        isActive: true,
          },
        });

    await createAuditLog(
      "coach_calendar_access.created",
      user.id,
      { ruleId: rule.id, ...data },
      undefined,
      user.tenantId
    );

    return NextResponse.json(rule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Calendar access create error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN" && user.role !== "COACH")) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Regel ontbreekt" }, { status: 400 });
  }

  await db.coachCalendarAccess.updateMany({
    where: { id, coachId: user.id },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
