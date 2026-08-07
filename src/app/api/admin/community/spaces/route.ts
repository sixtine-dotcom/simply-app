import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import {
  revokeCourseCommunityMembershipIfUnused,
  syncCourseCommunityMembershipsForCourse,
} from "@/lib/course-community";

const createSpaceSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  groupLabel: z.string().optional(),
  description: z.string().optional(),
  iconEmoji: z.string().optional(),
  isPublic: z.boolean().optional(),
  isHostOnly: z.boolean().optional(),
  isActive: z.boolean().optional(),
  linkedCourseIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const data = createSpaceSchema.parse(body);

    // Check if slug is unique
    const existingSpace = await db.space.findUnique({
      where: { slug: data.slug },
    });

    if (existingSpace) {
      return NextResponse.json(
        { error: "This slug is already in use" },
        { status: 400 }
      );
    }

    // Get max position
    const maxPosition = await db.space.aggregate({
      _max: { position: true },
    });

    const space = await db.space.create({
      data: {
        name: data.name,
        slug: data.slug,
        groupLabel: data.groupLabel?.trim() || null,
        description: data.description,
        iconEmoji: data.iconEmoji || "💬",
        isPublic: data.isPublic ?? true,
        isHostOnly: data.isHostOnly ?? false,
        isActive: data.isActive ?? true,
        position: (maxPosition._max.position || 0) + 1,
      },
    });

    const linkedCourseIds = Array.from(new Set(data.linkedCourseIds || []));

    if (linkedCourseIds.length > 0) {
      await db.course.updateMany({
        where: { id: { in: linkedCourseIds } },
        data: {
          hasCommunity: true,
          communitySpaceId: space.id,
        },
      });

      for (const courseId of linkedCourseIds) {
        await syncCourseCommunityMembershipsForCourse(courseId);
      }
    }

    await createAuditLog("space.created", user.id, {
      spaceId: space.id,
      linkedCourseIds,
    });

    return NextResponse.json(space);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Create space error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const spaces = await db.space.findMany({
      orderBy: { position: "asc" },
      include: {
        courses: {
          select: {
            id: true,
            title: true,
            slug: true,
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

    return NextResponse.json(spaces);
  } catch (error) {
    console.error("Get spaces error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
