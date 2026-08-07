import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog } from "@/lib/auth";
import { generateSlug } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    // Get the original course with all nested data
    const originalCourse = await db.course.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { position: "asc" },
          include: {
            lessons: {
              orderBy: { position: "asc" },
              include: {
                attachments: true,
              },
            },
          },
        },
      },
    });

    if (!originalCourse) {
      return NextResponse.json({ error: "Cursus niet gevonden" }, { status: 404 });
    }

    let newTitle: string;
    let baseSlug: string;
    let newSlug: string;
    try {
      const body = await request.json().catch(() => ({}));
      if (body && typeof body.newTitle === "string" && body.newTitle.trim()) {
        newTitle = body.newTitle.trim();
        baseSlug = generateSlug(newTitle);
        newSlug = baseSlug;
      } else {
        newTitle = `${originalCourse.title} (kopie)`;
        baseSlug = `${originalCourse.slug}-copy`;
        newSlug = baseSlug;
      }
    } catch {
      newTitle = `${originalCourse.title} (kopie)`;
      baseSlug = `${originalCourse.slug}-copy`;
      newSlug = baseSlug;
    }

    let slugCounter = 0;
    while (await db.course.findUnique({ where: { slug: newSlug } })) {
      slugCounter++;
      newSlug = `${baseSlug}-${slugCounter}`;
    }

    // Create the duplicate course
    const duplicatedCourse = await db.course.create({
      data: {
        title: newTitle,
        slug: newSlug,
        description: originalCourse.description,
        thumbnailUrl: originalCourse.thumbnailUrl,
        isPublished: false, // Start as draft
        isPrivate: originalCourse.isPrivate,
        hasCommunity: originalCourse.hasCommunity,
        communitySpaceId: originalCourse.communitySpaceId,
        coachId: originalCourse.coachId,
        drippingEnabled: originalCourse.drippingEnabled,
        drippingUnit: originalCourse.drippingUnit,
        drippingStartMode: originalCourse.drippingStartMode,
        drippingReleaseWeekday: originalCourse.drippingReleaseWeekday,
        drippingReleaseTime: originalCourse.drippingReleaseTime,
        photoMomentsCount: originalCourse.photoMomentsCount,
        photoMomentsIntervalWeeks: originalCourse.photoMomentsIntervalWeeks,
        modules: {
          create: originalCourse.modules.map((module) => ({
            title: module.title,
            description: module.description,
            position: module.position,
            unlockAfterDays: module.unlockAfterDays,
            lessons: {
              create: module.lessons.map((lesson) => ({
                title: lesson.title,
                content: lesson.content,
                extraContent: lesson.extraContent,
                checklistTitle: lesson.checklistTitle,
                checklistItems:
                  lesson.checklistItems === null
                    ? Prisma.JsonNull
                    : (lesson.checklistItems as Prisma.InputJsonValue),
                position: lesson.position,
                videoUrl: lesson.videoUrl,
                videoProvider: lesson.videoProvider,
                videoDuration: lesson.videoDuration,
                videoEmbedCode: lesson.videoEmbedCode,
                unlockAfterDays: lesson.unlockAfterDays,
                attachments: {
                  create: lesson.attachments.map((attachment) => ({
                    name: attachment.name,
                    url: attachment.url,
                    type: attachment.type,
                    size: attachment.size,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: {
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });

    await createAuditLog("course.duplicated", user.id, {
      originalCourseId: id,
      newCourseId: duplicatedCourse.id,
    });

    return NextResponse.json({
      id: duplicatedCourse.id,
      slug: duplicatedCourse.slug,
      title: duplicatedCourse.title,
    });
  } catch (error) {
    console.error("Duplicate course error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan" },
      { status: 500 }
    );
  }
}
