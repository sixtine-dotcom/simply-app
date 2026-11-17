import { db } from "./db";

/** Membership is private administration. Never create a feed entry, public
 * counter update, or notification to other participants when someone joins.
 * The joining customer's own activation/access mail is handled separately. */
export async function addCommunityMemberSilently(userId: string, spaceId: string) {
  const result = await db.spaceMember.createMany({
    data: [{ userId, spaceId }],
    skipDuplicates: true,
  });
  return result.count === 1;
}
