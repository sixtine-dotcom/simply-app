import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import {
  createCommunitySpaceForCourse,
  syncCourseCommunityMembershipsForCourse,
} from "@/lib/course-community";

const createCourseSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  isPrivate: z.boolean().optional(),
  hideForUnauthorized: z.boolean().optional(),
  hasCommunity: z.boolean().optional(),
  communitySpaceId: z.string().nullable().optional(),
  createCommunitySpace: z.boolean().optional(),
  drippingEnabled: z.boolean().optional(),
  drippingUnit: z.enum(["days", "weeks"]).optional(),
  photoMomentsCount: z.number().int().min(0).optional(),
  photoMomentsIntervalWeeks: z.number().int().min(1).nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = await request.json();
    const data = createCourseSchema.parse(body);

    if (data.hasCommunity && data.communitySpaceId) {
      const existingSpace = await db.space.findUnique({
        where: { id: data.communitySpaceId },
        select: { id: true },
      });
      if (!existingSpace) {
        return NextResponse.json({ error: "Geselecteerde space bestaat niet" }, { status: 400 });
      }
    }

    let communitySpaceId = data.hasCommunity ? data.communitySpaceId || null : null;
    if (data.hasCommunity && !communitySpaceId && data.createCommunitySpace) {
      const createdSpace = await createCommunitySpaceForCourse({
        title: data.title,
        slug: data.slug,
        description: data.description || null,
      });
      communitySpaceId = createdSpace.id;
    }

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
        hideForUnauthorized: data.hideForUnauthorized ?? true,
        hasCommunity: data.hasCommunity ?? true,
        communitySpaceId,
        drippingEnabled: data.drippingEnabled || false,
        drippingUnit: data.drippingUnit || null,
        photoMomentsCount: data.photoMomentsCount ?? 0,
        photoMomentsIntervalWeeks: data.photoMomentsIntervalWeeks ?? null,
      },
    });

    await createAuditLog(
      "course.created",
      user.id,
      {
        courseId: course.id,
        communitySpaceId: course.communitySpaceId,
        communityCreated: Boolean(data.createCommunitySpace && communitySpaceId),
      },
      undefined,
      user.tenantId
    );

    await syncCourseCommunityMembershipsForCourse(course.id);

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

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
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
