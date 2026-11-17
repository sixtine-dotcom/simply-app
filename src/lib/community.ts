import { db } from "./db";
import { CommentsClosedError, canManagePostComments } from "./community-comment-policy";
import { getBlockingCourseFormsForUser } from "./forms";

export interface SpaceWithMeta {
  id: string;
  name: string;
  slug: string;
  groupLabel: string | null;
  description: string | null;
  iconEmoji: string | null;
  isPublic: boolean;
  isHostOnly: boolean;
  isActive: boolean;
  position: number;
  postCount: number;
  latestPost: {
    id: string;
    content: string;
    createdAt: Date;
    author: {
      firstName: string;
      lastName: string;
    };
  } | null;
}

export interface PostWithDetails {
  id: string;
  title: string | null;
  content: string;
  pollQuestion: string | null;
  pollOptions: string[] | null;
  isPinned: boolean;
  commentsClosed: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: string;
  };
  space: {
    id: string;
    name: string;
    slug: string;
    isHostOnly: boolean;
    isActive: boolean;
  };
  attachments: {
    id: string;
    url: string;
    type: string;
    duration: number | null;
  }[];
  comments: Array<{
    id: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    author: {
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
      role: string;
    };
    attachments: {
      id: string;
      url: string;
      type: string;
      duration: number | null;
    }[];
  }>;
  poll: {
    totalVotes: number;
    userVote: number | null;
    options: Array<{
      index: number;
      label: string;
      votes: number;
    }>;
  } | null;
  _count: {
    comments: number;
    likes: number;
  };
  isLiked: boolean;
}

function parsePollOptions(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const options = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
  return options.length > 0 ? options : null;
}

function buildPoll(post: {
  pollQuestion: string | null;
  pollOptions: unknown;
  pollVotes: Array<{ userId: string; optionIndex: number }>;
}, userId: string) {
  const options = parsePollOptions(post.pollOptions);
  if (!post.pollQuestion || !options) return null;

  const votesByOption = new Map<number, number>();
  for (const vote of post.pollVotes) {
    votesByOption.set(vote.optionIndex, (votesByOption.get(vote.optionIndex) || 0) + 1);
  }

  const userVote = post.pollVotes.find((vote) => vote.userId === userId)?.optionIndex ?? null;

  return {
    totalVotes: post.pollVotes.length,
    userVote,
    options: options.map((label, index) => ({
      index,
      label,
      votes: votesByOption.get(index) || 0,
    })),
  };
}

/**
 * Get all spaces a user has access to
 */
export async function getUserSpaces(userId: string): Promise<SpaceWithMeta[]> {
  // Get user's space memberships
  const memberships = await db.spaceMember.findMany({
    where: { userId },
    select: { spaceId: true },
  });
  const memberSpaceIds = memberships.map((m) => m.spaceId);
  const linkedCourses = await db.course.findMany({
    where: {
      communitySpaceId: { in: memberSpaceIds.length > 0 ? memberSpaceIds : ["__none__"] },
      enrollments: { some: { userId } },
    },
    select: {
      id: true,
      communitySpaceId: true,
      enrollments: {
        where: { userId },
        take: 1,
        select: { startDate: true, endDate: true },
      },
    },
  });
  const blockedCourses = await getBlockingCourseFormsForUser({
    userId,
    courseIds: linkedCourses.map((course) => course.id),
  });
  const blockedSpaceIds = new Set(
    linkedCourses
      .filter((course) => {
        const enrollment = course.enrollments[0];
        const now = new Date();
        return blockedCourses.has(course.id)
          || !enrollment
          || enrollment.startDate > now
          || Boolean(enrollment.endDate && enrollment.endDate < now);
      })
      .map((course) => course.communitySpaceId)
      .filter((spaceId): spaceId is string => Boolean(spaceId))
  );

  // Get public spaces + member spaces
  const spaces = await db.space.findMany({
    where: {
      isActive: true,
      OR: [
        { isPublic: true },
        { id: { in: memberSpaceIds } },
      ],
    },
    orderBy: { position: "asc" },
    include: {
      _count: {
        select: { posts: true },
      },
      posts: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          author: {
            select: { firstName: true, lastName: true },
          },
        },
      },
    },
  });

  return spaces.filter((space) => !blockedSpaceIds.has(space.id)).map((space) => ({
    id: space.id,
    name: space.name,
    slug: space.slug,
    groupLabel: space.groupLabel,
    description: space.description,
    iconEmoji: space.iconEmoji,
    isPublic: space.isPublic,
    isHostOnly: space.isHostOnly,
    isActive: space.isActive,
    position: space.position,
    postCount: space._count.posts,
    latestPost: space.posts[0]
      ? {
          id: space.posts[0].id,
          content: space.posts[0].content.substring(0, 100),
          createdAt: space.posts[0].createdAt,
          author: space.posts[0].author,
        }
      : null,
  }));
}

/**
 * Get posts for a space or all spaces (feed)
 */
export async function getPosts(
  userId: string,
  options: {
    spaceId?: string;
    spaceSlug?: string;
    limit?: number;
    cursor?: string;
  } = {}
): Promise<{ posts: PostWithDetails[]; nextCursor: string | null }> {
  const { spaceId, spaceSlug, limit = 20, cursor } = options;

  // Build where clause
  let where: any = {};

  if (spaceId) {
    where.spaceId = spaceId;
  } else if (spaceSlug) {
    where.space = { slug: spaceSlug };
  } else {
    // Get all accessible spaces for feed
    const spaces = await getUserSpaces(userId);
    where.spaceId = { in: spaces.map((s) => s.id) };
  }

  if (cursor) {
    where.createdAt = { lt: new Date(cursor) };
  }

  const posts = await db.post.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: limit + 1,
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          role: true,
        },
      },
      space: {
        select: {
          id: true,
          name: true,
          slug: true,
          isHostOnly: true,
          isActive: true,
        },
      },
      attachments: true,
      pollVotes: {
        select: {
          userId: true,
          optionIndex: true,
        },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              role: true,
            },
          },
          attachments: true,
        },
      },
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
  });

  // Check if user liked each post
  const postIds = posts.map((p) => p.id);
  const userLikes = await db.postLike.findMany({
    where: {
      postId: { in: postIds },
      userId,
    },
    select: { postId: true },
  });
  const likedPostIds = new Set(userLikes.map((l) => l.postId));

  const hasMore = posts.length > limit;
  const postsToReturn = hasMore ? posts.slice(0, limit) : posts;

  return {
    posts: postsToReturn.map((post) => ({
      ...post,
      poll: buildPoll(post, userId),
      pollOptions: parsePollOptions(post.pollOptions),
      isLiked: likedPostIds.has(post.id),
    })),
    nextCursor: hasMore
      ? postsToReturn[postsToReturn.length - 1].createdAt.toISOString()
      : null,
  };
}

/**
 * Get a single post with all details
 */
export async function getPost(postId: string, userId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          role: true,
        },
      },
      space: {
        select: {
          id: true,
          name: true,
          slug: true,
          isHostOnly: true,
          isActive: true,
        },
      },
      attachments: true,
      pollVotes: {
        select: {
          userId: true,
          optionIndex: true,
        },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              role: true,
            },
          },
          attachments: true,
        },
      },
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
  });

  if (!post) return null;
  const hasAccess = await canUserAccessSpace(userId, post.space.id);
  if (!hasAccess) return null;

  // Check if user liked this post
  const userLike = await db.postLike.findUnique({
    where: {
      postId_userId: {
        postId,
        userId,
      },
    },
  });

  return {
    ...post,
    poll: buildPoll(post, userId),
    pollOptions: parsePollOptions(post.pollOptions),
    isLiked: !!userLike,
  };
}

/**
 * Create a new post
 */
export async function createPost(
  userId: string,
  spaceId: string,
  title: string | null,
  content: string,
  attachments?: { url: string; type: string; duration?: number }[],
  poll?: { question: string; options: string[] } | null,
  commentsClosed = false
) {
  if (commentsClosed) {
    const author = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!canManagePostComments(author?.role)) throw new Error("Alleen beheerders kunnen reacties uitschakelen.");
  }
  return db.post.create({
    data: {
      authorId: userId,
      spaceId,
      title,
      content,
      commentsClosed,
      pollQuestion: poll?.question || null,
      pollOptions: poll?.options ? poll.options : undefined,
      attachments: attachments
        ? {
            create: attachments.map((a) => ({
              url: a.url,
              type: a.type,
              duration: a.duration,
            })),
          }
        : undefined,
    },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          role: true,
        },
      },
      space: {
        select: {
          id: true,
          name: true,
          slug: true,
          isHostOnly: true,
        },
      },
      attachments: true,
      pollVotes: {
        select: {
          userId: true,
          optionIndex: true,
        },
      },
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
  });
}

export async function voteOnPoll(postId: string, userId: string, optionIndex: number) {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      pollQuestion: true,
      pollOptions: true,
      spaceId: true,
    },
  });

  const options = parsePollOptions(post?.pollOptions);
  if (!post || !post.pollQuestion || !options) {
    throw new Error("Deze post heeft geen poll.");
  }

  const hasAccess = await canUserAccessSpace(userId, post.spaceId);
  if (!hasAccess) {
    throw new Error("Je hebt geen toegang tot deze poll.");
  }

  if (optionIndex < 0 || optionIndex >= options.length) {
    throw new Error("Ongeldige poll-optie.");
  }

  await db.postPollVote.upsert({
    where: {
      postId_userId: {
        postId,
        userId,
      },
    },
    update: {
      optionIndex,
    },
    create: {
      postId,
      userId,
      optionIndex,
    },
  });

  return getPost(postId, userId);
}

/**
 * Toggle like on a post
 */
export async function togglePostLike(postId: string, userId: string) {
  const existingLike = await db.postLike.findUnique({
    where: {
      postId_userId: {
        postId,
        userId,
      },
    },
  });

  if (existingLike) {
    await db.postLike.delete({
      where: { id: existingLike.id },
    });
    return { liked: false };
  } else {
    await db.postLike.create({
      data: {
        postId,
        userId,
      },
    });
    return { liked: true };
  }
}

/**
 * Add a comment to a post
 */
export async function addComment(
  postId: string,
  userId: string,
  content: string,
  parentId?: string,
  attachments?: { url: string; type: string; duration?: number }[]
) {
  return db.$transaction(async tx => {
    // Closing a post and submitting a reply serialize on the same row. A stale
    // browser can never insert a comment after closure has committed.
    const [post] = await tx.$queryRaw<Array<{ commentsClosed: boolean }>>`
      SELECT "commentsClosed" FROM "Post" WHERE "id" = ${postId} FOR UPDATE`;
    if (!post) throw new Error("Post niet gevonden");
    if (post.commentsClosed) throw new CommentsClosedError();
    return tx.comment.create({
      data: {
        postId,
        authorId: userId,
        content,
        parentId,
        attachments: attachments
          ? {
              create: attachments.map((attachment) => ({
                url: attachment.url,
                type: attachment.type,
                duration: attachment.duration,
              })),
            }
          : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
        attachments: true,
      },
    });
  });
}

export async function updatePost(
  postId: string,
  userId: string,
  title: string | null,
  content: string
) {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });

  if (!post) {
    throw new Error("Post not found.");
  }

  if (post.authorId !== userId) {
    throw new Error("You can only edit your own posts.");
  }

  return db.post.update({
    where: { id: postId },
    data: {
      title,
      content,
    },
  });
}

export async function deletePost(postId: string, userId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });

  if (!post) {
    throw new Error("Post not found.");
  }

  if (post.authorId !== userId) {
    throw new Error("You can only delete your own posts.");
  }

  await db.post.delete({
    where: { id: postId },
  });
}

/**
 * Check if user can post in a space
 */
export async function canUserPostInSpace(
  userId: string,
  spaceId: string
): Promise<boolean> {
  const space = await db.space.findUnique({
    where: { id: spaceId },
  });

  if (!space) return false;
  if (!space.isActive) return false;
  if (await isSpaceBlockedByRequiredForm(userId, spaceId)) return false;

  // Host-only spaces: only admins can post
  if (space.isHostOnly) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return canManagePostComments(user?.role);
  }

  // Check if user has access to the space
  if (space.isPublic) return true;

  const membership = await db.spaceMember.findUnique({
    where: {
      userId_spaceId: {
        userId,
        spaceId,
      },
    },
  });

  return !!membership;
}

export async function canUserAccessSpace(userId: string, spaceId: string): Promise<boolean> {
  const space = await db.space.findUnique({
    where: { id: spaceId },
    select: {
      isPublic: true,
      isActive: true,
    },
  });

  if (!space || !space.isActive) return false;
  if (await isSpaceBlockedByRequiredForm(userId, spaceId)) return false;
  if (space.isPublic) return true;

  const membership = await db.spaceMember.findUnique({
    where: {
      userId_spaceId: {
        userId,
        spaceId,
      },
    },
  });

  return !!membership;
}

async function isSpaceBlockedByRequiredForm(userId: string, spaceId: string) {
  const courses = await db.course.findMany({
    where: {
      communitySpaceId: spaceId,
      enrollments: { some: { userId } },
    },
    select: {
      id: true,
      enrollments: {
        where: { userId },
        take: 1,
        select: { startDate: true, endDate: true },
      },
    },
  });
  const gates = await getBlockingCourseFormsForUser({
    userId,
    courseIds: courses.map((course) => course.id),
  });
  if (gates.size > 0) return true;
  const now = new Date();
  return courses.some((course) => {
    const enrollment = course.enrollments[0];
    return !enrollment
      || enrollment.startDate > now
      || Boolean(enrollment.endDate && enrollment.endDate < now);
  });
}
