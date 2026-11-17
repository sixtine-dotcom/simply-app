import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { db } from "../../src/lib/db";
import { addCommunityMemberSilently } from "../../src/lib/community-membership";
import { ensureCourseCommunityMembership, syncCourseCommunityMembershipsForCourse } from "../../src/lib/course-community";
import { canUserAccessSpace } from "../../src/lib/community";
import { createMentionNotifications } from "../../src/lib/community-mentions";

const base = process.env.SIMPLY_TEST_BASE_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Use a localhost test server only.");
async function main() {
  const nonce = randomBytes(7).toString("hex");
  const users: Array<{ id: string; email: string; firstName: string }> = [], tokens: string[] = [];
  let spaceId: string | undefined, courseId: string | undefined;
  async function request(path: string, account: number | null, method = "GET", body?: unknown) {
    return fetch(base + path, { method, headers: { ...(account !== null ? { Cookie: `simply_session=${tokens[account]}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  }
  try {
    for (let index = 0; index < 5; index++) {
      const user = await db.user.create({ data: { email: `silent-join-${nonce}-${index}@example.invalid`, firstName: `Silent${nonce}${index}`, lastName: "Temporary fixture", role: index === 0 ? "ADMIN" : "CLIENT" } }); users.push(user);
      if (index > 0) await db.auditLog.create({ data: { action: "user.created", metadata: { targetUserId: user.id } } });
      const token = randomBytes(32).toString("hex"); tokens.push(token);
      await db.authSession.create({ data: { userId: user.id, token: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 600_000) } });
    }
    const space = await db.space.create({ data: { name: "Temporary silent membership test", slug: `silent-join-${nonce}`, isPublic: false, members: { create: users.slice(0,2).map(user => ({ userId: user.id })) } } }); spaceId = space.id;
    const post = await db.post.create({ data: { spaceId, authorId: users[0].id, content: "Existing fixture post" } });
    const beforeSpaces = await (await request("/api/community/spaces", 1)).json();
    const before = beforeSpaces.find((entry: any) => entry.id === spaceId); assert(before);
    const bulkPath = `/api/admin/community/spaces/${spaceId}/members`;
    const bulk = await request(bulkPath, 0, "POST", { emails: [users[2].email] }); assert.equal(bulk.status, 200); assert.equal((await bulk.json()).added, 1);
    const detailPath = `/api/admin/users/${users[3].id}/spaces`;
    const detail = await request(detailPath, 0, "POST", { spaceId }); assert.equal(detail.status, 200); assert.equal((await detail.json()).matchedExistingMembership, false);
    const course = await db.course.create({ data: { title: "Unpublished silent membership fixture", slug: `silent-join-${nonce}`, isPrivate: true, isPublished: false, hasCommunity: true, communitySpaceId: spaceId } }); courseId = course.id;
    await db.enrollment.create({ data: { userId: users[4].id, courseId } });
    await ensureCourseCommunityMembership({ userId: users[4].id, courseId });
    const membership = await db.spaceMember.findUniqueOrThrow({ where: { userId_spaceId: { userId: users[4].id, spaceId } } });
    await syncCourseCommunityMembershipsForCourse(courseId);
    assert.equal((await db.spaceMember.findUniqueOrThrow({ where: { id: membership.id } })).createdAt.getTime(), membership.createdAt.getTime());
    const duplicateBulk = await (await request(bulkPath, 0, "POST", { emails: [users[2].email] })).json(); assert.equal(duplicateBulk.added, 0); assert.equal(duplicateBulk.skipped, 1);
    assert.equal((await (await request(detailPath, 0, "POST", { spaceId })).json()).matchedExistingMembership, true);
    const duplicates = await Promise.all(Array.from({ length: 4 }, () => addCommunityMemberSilently(users[4].id, spaceId!))); assert(duplicates.every(value => value === false));
    for (const target of users.slice(2)) assert(await canUserAccessSpace(target.id, spaceId), "Quietly added member has normal access");
    assert.equal(await db.post.count({ where: { spaceId } }), 1, "No welcome post is created");
    assert.equal(await db.scheduledCommunityPost.count({ where: { spaceId } }), 0, "No welcome post is queued");
    assert.equal(await db.notification.count({ where: { userId: { in: users.map(user => user.id) } } }), 0, "No membership notifications to existing or new users");
    const afterSpaces = await (await request("/api/community/spaces", 1)).json(); assert.deepEqual(afterSpaces.find((entry: any) => entry.id === spaceId), before, "No public count/activity changes on joining");
    const memberPath = `/api/community/spaces/${spaceId}/members`;
    assert.equal((await request(memberPath, null)).status, 401);
    assert.equal((await request(bulkPath, 1)).status, 403, "Admin roster stays private");
    const adminRoster = await (await request(bulkPath, 0)).json(); for (const target of users.slice(2)) assert(adminRoster.members.some((row: any) => row.userId === target.id));
    const unfiltered = await (await request(memberPath, 1)).json(); assert(!unfiltered.some((row: any) => users.slice(2).some(user => user.id === row.id)));
    for (const target of users.slice(2)) {
      const query = `?q=${encodeURIComponent(target.firstName)}`;
      assert.deepEqual(await (await request(memberPath + query, 1)).json(), [], "Customer cannot enumerate a silent new member by exact name");
      const adminMentions = await (await request(memberPath + query, 0)).json(); assert(adminMentions.some((row: any) => row.id === target.id));
    }
    await createMentionNotifications({ mentionedUserIds: users.slice(2).map(user => user.id), spaceId, tenantId: null, actorId: users[1].id, actorName: "Fixture member", link: `/community/${space.slug}` });
    assert.equal(await db.notification.count({ where: { userId: { in: users.slice(2).map(user => user.id) } } }), 0, "Forged mention IDs cannot bypass quiet-member visibility");
    await db.comment.create({ data: { postId: post.id, authorId: users[3].id, content: "A voluntary first reply" } });
    await db.post.create({ data: { spaceId, authorId: users[2].id, content: "A voluntary first post" } });
    for (const target of users.slice(2,4)) {
      const candidates = await (await request(memberPath + `?q=${target.firstName}`, 1)).json(); const visible = candidates.find((row: any) => row.id === target.id); assert(visible, "Voluntarily active peers can be tagged"); assert(!("createdAt" in visible) && !("email" in visible), "No join date/email exposed");
    }
    assert.deepEqual(await (await request(memberPath + `?q=${users[4].firstName}`, 1)).json(), [], "Still-silent course member remains hidden");
    await createMentionNotifications({ mentionedUserIds: [users[3].id], spaceId, tenantId: null, actorId: users[1].id, actorName: "Fixture member", link: `/community/${space.slug}` });
    assert.equal(await db.notification.count({ where: { userId: users[3].id, type: "community_mention" } }), 1, "Explicit mentions of visible people still work");
    assert.equal(await db.notification.count({ where: { userId: users[1].id } }), 0, "Existing members got no join announcement");
    console.log("PASS: bulk, individual and course joins are silent and idempotent; no posts/queued posts/notifications/public count changes; private roster; customer mention privacy and forged-ID protection; voluntary posts/replies restore normal mentions. Temporary private fixtures only; no emails sent.");
  } finally {
    await db.$disconnect();
    if (courseId) await db.course.deleteMany({ where: { id: courseId } });
    if (spaceId) await db.space.deleteMany({ where: { id: spaceId } });
    await db.notification.deleteMany({ where: { userId: { in: users.map(user => user.id) } } });
    for (const user of users) await db.auditLog.deleteMany({ where: { OR: [{ userId: user.id }, { metadata: { path: ["targetUserId"], equals: user.id } }, { metadata: { path: ["emails"], array_contains: [user.email] } }] } });
    await db.user.deleteMany({ where: { id: { in: users.map(user => user.id) } } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
