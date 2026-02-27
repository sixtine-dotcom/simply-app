import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog } from "@/lib/auth";

const updateModuleSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  position: z.number().min(0).optional(),
  unlockAfterDays: z.number().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const { id: courseId, moduleId } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateModuleSchema.parse(body);

    const module = await db.module.update({
      where: { id: moduleId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.unlockAfterDays !== undefined && { unlockAfterDays: data.unlockAfterDays }),
      },
    });

    await createAuditLog("module.updated", user.id, {
      courseId,
      moduleId,
      changes: data,
    });

    return NextResponse.json(module);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Update module error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const { id: courseId, moduleId } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    await db.module.delete({
      where: { id: moduleId },
    });

    await createAuditLog("module.deleted", user.id, {
      courseId,
      moduleId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete module error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
