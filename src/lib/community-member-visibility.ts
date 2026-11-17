import type { Prisma } from "@prisma/client";

const teamRoles = ["ADMIN", "SUPERADMIN", "COACH", "STAFF"] as const;
export type CommunityViewer = { id: string; role: string };

export function canBrowseCommunityParticipants(role: string) {
  return (teamRoles as readonly string[]).includes(role);
}

/** Reading an author's name in a community conversation never grants access
 * to a participant directory, people search, or peer-mention suggestions. */
export function visibleCommunityUsers(spaceId: string, tenantId: string | null, viewer: CommunityViewer): Prisma.UserWhereInput {
  const member: Prisma.UserWhereInput = { spaceMemberships: { some: { spaceId } } };
  if (!canBrowseCommunityParticipants(viewer.role)) {
    member.OR = [
      { id: viewer.id },
      { role: { in: [...teamRoles] } },
    ];
  }
  return {
    deletedAt: null,
    OR: [member, { role: { in: [...teamRoles] }, tenantId }],
  };
}
