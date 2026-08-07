import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import {
  createCommunitySpaceForCourse,
  revokeSpaceMembershipIfUnused,
  syncCourseCommunityMembershipsForCourse,
} from "@/lib/course-community";

const updateCourseSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  isPublished: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  hideForUnauthorized: z.boolean().optional(),
  hasCommunity: z.boolean().optional(),
  communitySpaceId: z.string().nullable().optional(),
  createCommunitySpace: z.boolean().optional(),
  drippingEnabled: z.boolean().optional(),
  drippingUnit: z.enum(["days", "weeks"]).optional(),
  drippingStartMode: z.enum(["enrollment", "published"]).nullable().optional(),
  drippingReleaseWeekday: z.number().int().min(1).max(7).nullable().optional(),
  drippingReleaseTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  photoMomentsCount: z.number().int().min(0).optional(),
  photoMomentsIntervalWeeks: z.number().int().min(1).nullable().optional(),
  coachId: z.string().nullable().optional(),
  trajectoryStartDate: z.coerce.date().nullable().optional(),
  trajectoryEndDate: z.coerce.date().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateCourseSchema.parse(body);
    const previousCourse = await db.course.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        hasCommunity: true,
        communitySpaceId: true,
        trajectoryStartDate: true,
        trajectoryEndDate: true,
      },
    });

    if (!previousCourse) {
      return NextResponse.json({ error: "Cursus niet gevonden" }, { status: 404 });
    }

    const nextTrajectoryStart =
      data.trajectoryStartDate !== undefined
        ? data.trajectoryStartDate
        : previousCourse.trajectoryStartDate;
    const nextTrajectoryEnd =
      data.trajectoryEndDate !== undefined
        ? data.trajectoryEndDate
        : previousCourse.trajectoryEndDate;

    if (nextTrajectoryStart && nextTrajectoryEnd && nextTrajectoryEnd < nextTrajectoryStart) {
      return NextResponse.json(
        { error: "De einddatum moet na de startdatum liggen" },
        { status: 400 }
      );
    }

    if (data.communitySpaceId) {
      const existingSpace = await db.space.findUnique({
        where: { id: data.communitySpaceId },
        select: { id: true },
      });
      if (!existingSpace) {
        return NextResponse.json({ error: "Geselecteerde space bestaat niet" }, { status: 400 });
      }
    }

    let communitySpaceId =
      data.communitySpaceId !== undefined
        ? data.communitySpaceId || null
        : previousCourse.communitySpaceId || null;

    if (
      (data.hasCommunity ?? previousCourse.hasCommunity) &&
      !communitySpaceId &&
      data.createCommunitySpace
    ) {
      const createdSpace = await createCommunitySpaceForCourse({
        title: data.title || previousCourse.title,
        slug: data.slug || previousCourse.slug,
        description:
          data.description !== undefined ? data.description : previousCourse.description,
      });
      communitySpaceId = createdSpace.id;
    }

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
        ...(data.hideForUnauthorized !== undefined && {
          hideForUnauthorized: data.hideForUnauthorized,
        }),
        ...(data.hasCommunity !== undefined && { hasCommunity: data.hasCommunity }),
        ...((data.communitySpaceId !== undefined || data.createCommunitySpace) && {
          communitySpaceId: data.hasCommunity === false ? null : communitySpaceId,
        }),
        ...(data.hasCommunity === false && { communitySpaceId: null }),
        ...(data.drippingEnabled !== undefined && { drippingEnabled: data.drippingEnabled }),
        ...(data.drippingUnit !== undefined && { drippingUnit: data.drippingUnit }),
        ...(data.drippingStartMode !== undefined && { drippingStartMode: data.drippingStartMode }),
        ...(data.drippingReleaseWeekday !== undefined && {
          drippingReleaseWeekday: data.drippingReleaseWeekday,
        }),
        ...(data.drippingReleaseTime !== undefined && {
          drippingReleaseTime: data.drippingReleaseTime,
        }),
        ...(data.photoMomentsCount !== undefined && { photoMomentsCount: data.photoMomentsCount }),
        ...(data.photoMomentsIntervalWeeks !== undefined && { photoMomentsIntervalWeeks: data.photoMomentsIntervalWeeks }),
        ...(data.coachId !== undefined && { coachId: data.coachId }),
        ...(data.trajectoryStartDate !== undefined && {
          trajectoryStartDate: data.trajectoryStartDate,
        }),
        ...(data.trajectoryEndDate !== undefined && {
          trajectoryEndDate: data.trajectoryEndDate,
        }),
      },
    });

    if (data.trajectoryStartDate !== undefined || data.trajectoryEndDate !== undefined) {
      await db.enrollment.updateMany({
        where: { courseId: id },
        data: {
          ...(data.trajectoryStartDate !== undefined && data.trajectoryStartDate && {
            startDate: data.trajectoryStartDate,
          }),
          ...(data.trajectoryEndDate !== undefined && { endDate: data.trajectoryEndDate }),
        },
      });
      if (data.trajectoryStartDate) {
        await db.nutritionPlan.updateMany({
          where: { courseId: id },
          data: { availableAt: data.trajectoryStartDate },
        });
      }
    }

    await createAuditLog("course.updated", user.id, {
      courseId: id,
      changes: data,
      communitySpaceId: course.communitySpaceId,
    });

    await syncCourseCommunityMembershipsForCourse(id);

    const previousSpaceId =
      previousCourse.hasCommunity && previousCourse.communitySpaceId
        ? previousCourse.communitySpaceId
        : null;
    const currentSpaceId =
      course.hasCommunity && course.communitySpaceId ? course.communitySpaceId : null;

    if (previousSpaceId && previousSpaceId !== currentSpaceId) {
      const enrollmentUserIds = await db.enrollment.findMany({
        where: {
          courseId: id,
          OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        },
        select: { userId: true },
      });

      for (const enrollment of enrollmentUserIds) {
        await revokeSpaceMembershipIfUnused({
          userId: enrollment.userId,
          spaceId: previousSpaceId,
        });
      }
    }

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

    if (!user || user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
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
