import { db } from "./db";

export interface SpaceWithMeta {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconEmoji: string | null;
  isPublic: boolean;
  isHostOnly: boolean;
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
  content: string;
  isPinned: boolean;
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
  };
  attachments: {
    id: string;
    url: string;
    type: string;
    duration: number | null;
  }[];
  _count: {
    comments: number;
    likes: number;
  };
  isLiked: boolean;
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

  // Get public spaces + member spaces
  const spaces = await db.space.findMany({
    where: {
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

  return spaces.map((space) => ({
    id: space.id,
    name: space.name,
    slug: space.slug,
    description: space.description,
    iconEmoji: space.iconEmoji,
    isPublic: space.isPublic,
    isHostOnly: space.isHostOnly,
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
        },
      },
      attachments: true,
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
        },
      },
      attachments: true,
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
    isLiked: !!userLike,
  };
}

/**
 * Create a new post
 */
export async function createPost(
  userId: string,
  spaceId: string,
  content: string,
  attachments?: { url: string; type: string; duration?: number }[]
) {
  return db.post.create({
    data: {
      authorId: userId,
      spaceId,
      content,
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
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
  });
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
  parentId?: string
) {
  return db.comment.create({
    data: {
      postId,
      authorId: userId,
      content,
      parentId,
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
    },
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

  // Host-only spaces: only admins can post
  if (space.isHostOnly) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === "ADMIN";
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
