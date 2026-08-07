import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAuditLog, getCurrentUser } from "@/lib/auth";
import {
  revokeCourseCommunityMembershipIfUnused,
  syncCourseCommunityMembershipsForCourse,
} from "@/lib/course-community";

const updateSpaceSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  groupLabel: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  iconEmoji: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
  isHostOnly: z.boolean().optional(),
  isActive: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
  linkedCourseIds: z.array(z.string()).optional(),
});

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const space = await db.space.findUnique({
      where: { id },
      include: {
        courses: {
          orderBy: { title: "asc" },
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        posts: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            _count: {
              select: {
                comments: true,
                likes: true,
              },
            },
          },
        },
        members: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            posts: true,
            members: true,
          },
        },
      },
    });

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }

    return NextResponse.json(space);
  } catch (error) {
    console.error("Get space error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateSpaceSchema.parse(body);

    const previousCourses = await db.course.findMany({
      where: { communitySpaceId: id },
      select: { id: true },
    });

    if (data.slug) {
      const normalizedSlug = normalizeSlug(data.slug);
      const existing = await db.space.findFirst({
        where: {
          slug: normalizedSlug,
          id: { not: id },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "This slug is already in use" },
          { status: 400 }
        );
      }
      data.slug = normalizedSlug;
    }

    const space = await db.space.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.groupLabel !== undefined && { groupLabel: data.groupLabel?.trim() || null }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.iconEmoji !== undefined && { iconEmoji: data.iconEmoji }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        ...(data.isHostOnly !== undefined && { isHostOnly: data.isHostOnly }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.position !== undefined && { position: data.position }),
      },
    });

    if (data.linkedCourseIds !== undefined) {
      const nextLinkedCourseIds = Array.from(new Set(data.linkedCourseIds));
      const previousLinkedCourseIds = previousCourses.map((course) => course.id);
      const removedCourseIds = previousLinkedCourseIds.filter(
        (courseId) => !nextLinkedCourseIds.includes(courseId)
      );

      if (removedCourseIds.length > 0) {
        await db.course.updateMany({
          where: {
            id: { in: removedCourseIds },
            communitySpaceId: id,
          },
          data: {
            communitySpaceId: null,
          },
        });

        for (const courseId of removedCourseIds) {
          const enrollments = await db.enrollment.findMany({
            where: { courseId },
            select: { userId: true },
          });

          for (const enrollment of enrollments) {
            await revokeCourseCommunityMembershipIfUnused({
              userId: enrollment.userId,
              courseId,
            });
          }
        }
      }

      if (nextLinkedCourseIds.length > 0) {
        await db.course.updateMany({
          where: { id: { in: nextLinkedCourseIds } },
          data: {
            hasCommunity: true,
            communitySpaceId: id,
          },
        });

        for (const courseId of nextLinkedCourseIds) {
          await syncCourseCommunityMembershipsForCourse(courseId);
        }
      }
    }

    await createAuditLog("space.updated", user.id, {
      spaceId: id,
      changes: data,
    });

    return NextResponse.json(space);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Update space error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    await db.space.delete({ where: { id } });

    await createAuditLog("space.deleted", user.id, { spaceId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete space error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
