import { addCommunityMemberSilently } from "./community-membership";
import { db } from "@/lib/db";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function createCommunitySpaceForCourse(params: {
  title: string;
  slug: string;
  description?: string | null;
}) {
  const baseName = `${params.title} Community`;
  const baseSlug = slugify(`${params.slug}-community`) || `course-community`;
  let nextSlug = baseSlug;
  let suffix = 2;

  while (await db.space.findUnique({ where: { slug: nextSlug }, select: { id: true } })) {
    nextSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const maxPosition = await db.space.aggregate({
    _max: { position: true },
  });

  return db.space.create({
    data: {
      name: baseName,
      slug: nextSlug,
      description: params.description || `Besloten community voor ${params.title}.`,
      iconEmoji: "💬",
      isPublic: false,
      isHostOnly: false,
      position: (maxPosition._max.position || 0) + 1,
    },
  });
}

export async function ensureCourseCommunityMembership(params: {
  userId: string;
  courseId: string;
}) {
  const course = await db.course.findUnique({
    where: { id: params.courseId },
    select: {
      id: true,
      hasCommunity: true,
      communitySpaceId: true,
    },
  });

  if (!course || !course.hasCommunity || !course.communitySpaceId) {
    return;
  }

  await addCommunityMemberSilently(params.userId, course.communitySpaceId);
}

export async function revokeCourseCommunityMembershipIfUnused(params: {
  userId: string;
  courseId: string;
}) {
  const course = await db.course.findUnique({
    where: { id: params.courseId },
    select: {
      id: true,
      hasCommunity: true,
      communitySpaceId: true,
    },
  });

  if (!course || !course.hasCommunity || !course.communitySpaceId) {
    return;
  }

  await revokeSpaceMembershipIfUnused({
    userId: params.userId,
    spaceId: course.communitySpaceId,
  });
}

export async function revokeSpaceMembershipIfUnused(params: {
  userId: string;
  spaceId: string;
}) {
  const activeCommunityCourseCount = await db.enrollment.count({
    where: {
      userId: params.userId,
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      course: {
        hasCommunity: true,
        communitySpaceId: params.spaceId,
      },
    },
  });

  if (activeCommunityCourseCount > 0) {
    return;
  }

  await db.spaceMember.deleteMany({
    where: {
      userId: params.userId,
      spaceId: params.spaceId,
    },
  });
}

export async function syncCourseCommunityMembershipsForCourse(courseId: string) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      hasCommunity: true,
      communitySpaceId: true,
    },
  });

  if (!course?.hasCommunity || !course.communitySpaceId) {
    return;
  }

  const enrollments = await db.enrollment.findMany({
    where: {
      courseId,
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
    },
    select: { userId: true },
  });

  for (const enrollment of enrollments) {
    await ensureCourseCommunityMembership({
      userId: enrollment.userId,
      courseId,
    });
  }
}
