import { db } from "@/lib/db";

export async function getMentionableUsers(spaceId: string, tenantId: string | null, query = "") {
  const words = query.trim().split(/\s+/).filter(Boolean);
  return db.user.findMany({
    where: {
      deletedAt: null,
      AND: [
        {
          OR: [
            { spaceMemberships: { some: { spaceId } } },
            {
              role: { in: ["ADMIN", "SUPERADMIN", "COACH", "STAFF"] },
              ...(tenantId ? { tenantId } : {}),
            },
          ],
        },
        ...words.map((word) => ({
          OR: [
            { firstName: { contains: word, mode: "insensitive" as const } },
            { lastName: { contains: word, mode: "insensitive" as const } },
          ],
        })),
      ],
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 8,
    select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
  });
}

export async function createMentionNotifications({
  mentionedUserIds,
  spaceId,
  tenantId,
  actorId,
  actorName,
  link,
}: {
  mentionedUserIds: string[];
  spaceId: string;
  tenantId: string | null;
  actorId: string;
  actorName: string;
  link: string;
}) {
  if (!mentionedUserIds.length) return;
  const requestedIds = Array.from(new Set(mentionedUserIds)).filter((id) => id !== actorId);
  const allowedUsers = await db.user.findMany({
    where: {
      id: { in: requestedIds },
      deletedAt: null,
      OR: [
        { spaceMemberships: { some: { spaceId } } },
        {
          role: { in: ["ADMIN", "SUPERADMIN", "COACH", "STAFF"] },
          ...(tenantId ? { tenantId } : {}),
        },
      ],
    },
    select: { id: true },
  });
  const recipients = allowedUsers.map((user) => user.id);
  if (!recipients.length) return;

  await db.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      type: "community_mention",
      title: `${actorName} heeft je getagd`,
      body: "Je bent genoemd in een communitybericht.",
      link,
    })),
  });
}
