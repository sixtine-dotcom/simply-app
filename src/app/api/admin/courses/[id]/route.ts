import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog } from "@/lib/auth";

const updateCourseSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  isPublished: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  hasCommunity: z.boolean().optional(),
  drippingEnabled: z.boolean().optional(),
  drippingUnit: z.enum(["days", "weeks"]).optional(),
  photoMomentsCount: z.number().int().min(0).optional(),
  photoMomentsIntervalWeeks: z.number().int().min(1).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateCourseSchema.parse(body);

    // Check if slug is unique (if changed)
    if (data.slug) {
      const existingCourse = await db.course.findFirst({
        where: {
          slug: data.slug,
          id: { not: id },
        },
      });

      if (existingCourse) {
        return NextResponse.json(
          { error: "Deze slug is al in gebruik" },
          { status: 400 }
        );
      }
    }

    const course = await db.course.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.slug && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl || null }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
        ...(data.isPrivate !== undefined && { isPrivate: data.isPrivate }),
        ...(data.hasCommunity !== undefined && { hasCommunity: data.hasCommunity }),
        ...(data.drippingEnabled !== undefined && { drippingEnabled: data.drippingEnabled }),
        ...(data.drippingUnit && { drippingUnit: data.drippingUnit }),
        ...(data.photoMomentsCount !== undefined && { photoMomentsCount: data.photoMomentsCount }),
        ...(data.photoMomentsIntervalWeeks !== undefined && { photoMomentsIntervalWeeks: data.photoMomentsIntervalWeeks }),
      },
    });

    await createAuditLog("course.updated", user.id, {
      courseId: id,
      changes: data,
    });

    return NextResponse.json(course);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Update course error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    // Check for enrollments
    const enrollmentCount = await db.enrollment.count({
      where: { courseId: id },
    });

    if (enrollmentCount > 0) {
      return NextResponse.json(
        { error: `Kan cursus niet verwijderen: ${enrollmentCount} actieve inschrijvingen` },
        { status: 400 }
      );
    }

    await db.course.delete({
      where: { id },
    });

    await createAuditLog("course.deleted", user.id, { courseId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete course error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
