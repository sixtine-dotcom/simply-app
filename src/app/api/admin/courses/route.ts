import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog } from "@/lib/auth";

const createCourseSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  isPrivate: z.boolean().optional(),
  hasCommunity: z.boolean().optional(),
  drippingEnabled: z.boolean().optional(),
  drippingUnit: z.enum(["days", "weeks"]).optional(),
  photoMomentsCount: z.number().int().min(0).optional(),
  photoMomentsIntervalWeeks: z.number().int().min(1).nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = await request.json();
    const data = createCourseSchema.parse(body);

    // Check if slug is unique
    const existingCourse = await db.course.findUnique({
      where: { slug: data.slug },
    });

    if (existingCourse) {
      return NextResponse.json(
        { error: "Deze slug is al in gebruik" },
        { status: 400 }
      );
    }

    const course = await db.course.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        isPublished: false,
        isPrivate: data.isPrivate || false,
        hasCommunity: data.hasCommunity ?? true,
        drippingEnabled: data.drippingEnabled || false,
        drippingUnit: data.drippingUnit || null,
        photoMomentsCount: data.photoMomentsCount ?? 0,
        photoMomentsIntervalWeeks: data.photoMomentsIntervalWeeks ?? null,
      },
    });

    await createAuditLog("course.created", user.id, {
      courseId: course.id,
    });

    return NextResponse.json(course);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Create course error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const courses = await db.course.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error("Get courses error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
