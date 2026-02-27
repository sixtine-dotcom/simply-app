import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog } from "@/lib/auth";

const createModuleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  position: z.number().min(0),
  unlockAfterDays: z.number().optional(),
});

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

    const body = await request.json();
    const data = createModuleSchema.parse(body);

    const module = await db.module.create({
      data: {
        courseId,
        title: data.title,
        description: data.description,
        position: data.position,
        unlockAfterDays: data.unlockAfterDays,
      },
    });

    await createAuditLog("module.created", user.id, {
      courseId,
      moduleId: module.id,
    });

    return NextResponse.json(module);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Create module error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

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

    const modules = await db.module.findMany({
      where: { courseId },
      orderBy: { position: "asc" },
      include: {
        lessons: {
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json(modules);
  } catch (error) {
    console.error("Get modules error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
