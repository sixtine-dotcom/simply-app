import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog } from "@/lib/auth";

const addEnrollmentsSchema = z.object({
  userIds: z.array(z.string()).optional(),
  emails: z.array(z.string().email()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
}).refine((d) => (d.userIds?.length ?? 0) > 0 || (d.emails?.length ?? 0) > 0, {
  message: "Geef userIds of emails op",
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const enrollments = await db.enrollment.findMany({
      where: { courseId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(enrollments);
  } catch (error) {
    console.error("Get enrollments error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: "Cursus niet gevonden" }, { status: 404 });
    }
    const body = await request.json();
    const data = addEnrollmentsSchema.parse(body);
    const startDate = data.startDate && data.startDate.trim() ? new Date(data.startDate) : new Date();
    const endDate = data.endDate && data.endDate.trim() ? new Date(data.endDate) : null;

    let userIds: string[] = [];
    if (data.userIds?.length) {
      userIds = data.userIds;
    }
    if (data.emails?.length) {
      const users = await db.user.findMany({
        where: { email: { in: data.emails!.map((e) => e.toLowerCase()) } },
        select: { id: true },
      });
      userIds = Array.from(new Set([...userIds, ...users.map((u) => u.id)]));
    }

    const created: string[] = [];
    const skipped: string[] = [];
    for (const userId of userIds) {
      const existing = await db.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
      if (existing) {
        skipped.push(userId);
        continue;
      }
      await db.enrollment.create({
        data: { userId, courseId, startDate, endDate },
      });
      created.push(userId);
    }

    await createAuditLog("enrollments.added", user.id, {
      courseId,
      count: created.length,
      startDate: startDate.toISOString(),
      endDate: endDate?.toISOString() ?? null,
    });

    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Add enrollments error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
