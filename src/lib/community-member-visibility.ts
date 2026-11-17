import type { Prisma } from "@prisma/client";

const teamRoles = ["ADMIN", "SUPERADMIN", "COACH", "STAFF"] as const;
export type CommunityViewer = { id: string; role: string };

export function canSeeSilentCommunityMembers(role: string) {
  return (teamRoles as readonly string[]).includes(role);
}

/** Customers discover peers through voluntary posts/replies, never by a join
 * event or by enumerating newly enrolled people through @ suggestions. */
export function visibleCommunityUsers(spaceId: string, tenantId: string | null, viewer: CommunityViewer): Prisma.UserWhereInput {
  const member: Prisma.UserWhereInput = { spaceMemberships: { some: { spaceId } } };
  if (!canSeeSilentCommunityMembers(viewer.role)) {
    member.OR = [
      { id: viewer.id },
      { role: { in: [...teamRoles] } },
      { posts: { some: { spaceId } } },
      { comments: { some: { post: { spaceId } } } },
    ];
  }
  return {
    deletedAt: null,
    OR: [member, { role: { in: [...teamRoles] }, tenantId }],
  };
}
