import { db } from "@/lib/db";

type AttachmentInput = {
  url: string;
  type: "image" | "video" | "voice_memo" | "file";
  duration?: number | null;
};

type PollInput = {
  question: string;
  options: string[];
} | null;

export async function getCommunityCoursesForScheduling() {
  return db.course.findMany({
    where: {
      hasCommunity: true,
      communitySpaceId: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      communitySpaceId: true,
      communitySpace: {
        select: {
          id: true,
          name: true,
          slug: true,
          isHostOnly: true,
        },
      },
    },
  });
}

export async function getScheduledCommunityPosts(courseId?: string) {
  return db.scheduledCommunityPost.findMany({
    where: courseId ? { courseId } : undefined,
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      space: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      publishedPost: {
        select: {
          id: true,
        },
      },
    },
  });
}

export async function createScheduledCommunityPost(params: {
  courseId: string;
  authorId: string;
  title?: string | null;
  content: string;
  scheduledAt: Date;
  isPinned?: boolean;
  attachments?: AttachmentInput[];
  poll?: PollInput;
}) {
  const course = await db.course.findUnique({
    where: { id: params.courseId },
    select: {
      id: true,
      communitySpaceId: true,
    },
  });

  if (!course?.communitySpaceId) {
    throw new Error("Deze cursus heeft nog geen gekoppelde community.");
  }

  return db.scheduledCommunityPost.create({
    data: {
      courseId: course.id,
      spaceId: course.communitySpaceId,
      authorId: params.authorId,
      title: params.title?.trim() || null,
      content: params.content.trim(),
      scheduledAt: params.scheduledAt,
      isPinned: Boolean(params.isPinned),
      attachments: params.attachments?.length ? params.attachments : undefined,
      pollQuestion: params.poll?.question?.trim() || null,
      pollOptions: params.poll?.options?.length ? params.poll.options : undefined,
    },
  });
}

export async function cancelScheduledCommunityPost(id: string) {
  return db.scheduledCommunityPost.update({
    where: { id },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
    },
  });
}

export async function duplicateScheduledCommunityPosts(params: {
  sourceCourseId: string;
  targetCourseId: string;
  targetStartAt: Date;
  authorId: string;
}) {
  const [sourcePosts, targetCourse] = await Promise.all([
    db.scheduledCommunityPost.findMany({
      where: {
        courseId: params.sourceCourseId,
        status: { in: ["scheduled", "published"] },
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    }),
    db.course.findUnique({
      where: { id: params.targetCourseId },
      select: {
        id: true,
        communitySpaceId: true,
      },
    }),
  ]);

  if (sourcePosts.length === 0) {
    throw new Error("Er zijn geen geplande of gepubliceerde templateposts om te dupliceren.");
  }

  if (!targetCourse?.communitySpaceId) {
    throw new Error("Het doeltraject heeft nog geen gekoppelde community.");
  }

  const sourceStart = sourcePosts[0].scheduledAt.getTime();
  const targetStart = params.targetStartAt.getTime();

  const created = await db.$transaction(
    sourcePosts.map((post) =>
      db.scheduledCommunityPost.create({
        data: {
          courseId: targetCourse.id,
          spaceId: targetCourse.communitySpaceId!,
          authorId: params.authorId,
          title: post.title,
          content: post.content,
          pollQuestion: post.pollQuestion,
          pollOptions: post.pollOptions === null ? undefined : post.pollOptions,
          attachments: post.attachments === null ? undefined : post.attachments,
          isPinned: post.isPinned,
          scheduledAt: new Date(targetStart + (post.scheduledAt.getTime() - sourceStart)),
          duplicateSourceId: post.id,
        },
      })
    )
  );

  return created;
}

export async function publishDueScheduledCommunityPosts(limit = 25) {
  const duePosts = await db.scheduledCommunityPost.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });

  const result = {
    checked: duePosts.length,
    published: 0,
    failed: 0,
  };

  for (const scheduledPost of duePosts) {
    try {
      await db.$transaction(async (tx) => {
        const fresh = await tx.scheduledCommunityPost.findUnique({
          where: { id: scheduledPost.id },
          select: {
            id: true,
            status: true,
            title: true,
            content: true,
            pollQuestion: true,
            pollOptions: true,
            attachments: true,
            isPinned: true,
            authorId: true,
            spaceId: true,
          },
        });

        if (!fresh || fresh.status !== "scheduled") {
          return;
        }

        const attachments = Array.isArray(fresh.attachments)
          ? (fresh.attachments as AttachmentInput[])
          : [];

        const post = await tx.post.create({
          data: {
            authorId: fresh.authorId,
            spaceId: fresh.spaceId,
            title: fresh.title,
            content: fresh.content,
            pollQuestion: fresh.pollQuestion,
            pollOptions: fresh.pollOptions === null ? undefined : fresh.pollOptions,
            isPinned: fresh.isPinned,
            attachments: attachments.length
              ? {
                  create: attachments.map((attachment) => ({
                    url: attachment.url,
                    type: attachment.type,
                    duration: attachment.duration ?? undefined,
                  })),
                }
              : undefined,
          },
          select: { id: true },
        });

        await tx.scheduledCommunityPost.update({
          where: { id: fresh.id },
          data: {
            status: "published",
            publishedAt: new Date(),
            publishedPostId: post.id,
            lastError: null,
          },
        });
      });

      result.published += 1;
    } catch (error) {
      result.failed += 1;
      await db.scheduledCommunityPost.update({
        where: { id: scheduledPost.id },
        data: {
          status: "failed",
          lastError: error instanceof Error ? error.message : "Onbekende fout",
        },
      });
    }
  }

  return result;
}
