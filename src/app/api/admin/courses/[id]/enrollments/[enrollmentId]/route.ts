import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog } from "@/lib/auth";

const updateSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> }
) {
  try {
    const { id: courseId, enrollmentId } = await params;
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    const body = await request.json();
    const data = updateSchema.parse(body);
    const enrollment = await db.enrollment.update({
      where: {
        id: enrollmentId,
        courseId,
      },
      data: {
        ...(data.startDate && data.startDate.trim() && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate && data.endDate.trim() ? new Date(data.endDate) : null,
        }),
      },
    });
    await createAuditLog("enrollment.updated", user.id, {
      courseId,
      enrollmentId,
      changes: data,
    });
    return NextResponse.json(enrollment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Update enrollment error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> }
) {
  try {
    const { id: courseId, enrollmentId } = await params;
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    await db.enrollment.delete({
      where: { id: enrollmentId, courseId },
    });
    await createAuditLog("enrollment.removed", user.id, {
      courseId,
      enrollmentId,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete enrollment error:", error);
    return NextResponse.json({ error: "Er is iets misgegaan" }, { status: 500 });
  }
}
