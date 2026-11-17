import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../../src/lib/db";
import { addComment } from "../../src/lib/community";
import { CommentsClosedError } from "../../src/lib/community-comment-policy";

const base = process.env.SIMPLY_TEST_BASE_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Use a local server only.");
async function main() {
  const users: string[] = [], tokens: string[] = [];
  const nonce = randomBytes(8).toString("hex");
  let spaceId: string | undefined;
  async function request(path: string, method: string, body?: unknown, account: number | null = 0) {
    return fetch(base + path, { method, headers: { ...(account !== null ? { Cookie: `simply_session=${tokens[account]}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  }
  try {
    for (const [index, role] of (["ADMIN", "SUPERADMIN", "CLIENT", "COACH", "ADMIN"] as const).entries()) {
      const user = await db.user.create({ data: { email: `comment-settings-${nonce}-${index}@example.invalid`, firstName: "Temporary", lastName: "Comment settings", role } }); users.push(user.id);
      if (role === "CLIENT") await db.auditLog.create({ data: { action: "user.created", metadata: { targetUserId: user.id } } });
      const token = randomBytes(32).toString("hex"); tokens.push(token);
      await db.authSession.create({ data: { userId: user.id, token: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 600_000) } });
    }
    const space = await db.space.create({ data: { name: "Temporary comment settings test", slug: `comment-settings-${nonce}`, isPublic: false, members: { create: users.slice(0,4).map(userId => ({ userId })) } } }); spaceId = space.id;
    const root = "/api/community/posts";
    const created = await request(root, "POST", { spaceId, title: "Temporary closed post", content: "Synthetic test content", commentsClosed: true }); assert.equal(created.status, 200);
    const post = await created.json(); assert.equal(post.commentsClosed, true);
    const comments = `${root}/${post.id}/comments`;
    const before = await db.comment.count({ where: { postId: post.id } });
    for (const account of [0,1,2,3]) assert.equal((await request(comments, "POST", { content: "Cannot reply" }, account)).status, 403, "Closure applies to every role");
    assert.equal((await request(comments, "PATCH", { commentsClosed: false }, null)).status, 401);
    for (const account of [2,3,4]) assert.equal((await request(comments, "PATCH", { commentsClosed: false }, account)).status, 403, "Only admins with access may manage closure");
    assert.equal((await request(comments, "PATCH", { commentsClosed: "false" })).status, 400);
    for (const flag of [true, false]) assert.equal((await request(root, "POST", { spaceId, content: "Forged setting", commentsClosed: flag }, 2)).status, 403);
    assert.equal(await db.comment.count({ where: { postId: post.id } }), before);
    assert.equal((await request(comments, "PATCH", { commentsClosed: false }, 1)).status, 200, "Superadmin can reopen");
    const reply = await request(comments, "POST", { content: "Original comment remains readable" }, 2); assert.equal(reply.status, 200); const comment = await reply.json();
    assert.equal((await request(comments, "PATCH", { commentsClosed: true })).status, 200);
    assert.equal((await request(comments, "POST", { content: "Nested reply blocked", parentId: comment.id }, 2)).status, 403);
    const visible = await (await request(comments, "GET", undefined, 2)).json(); assert(visible.some((row: any) => row.id === comment.id), "Existing comments remain readable");
    assert.equal((await request(comments, "PATCH", { commentsClosed: false })).status, 200);
    assert.equal((await request(comments, "POST", { content: "Can reply again", parentId: comment.id }, 2)).status, 200);
    const clientPostResponse = await request(root, "POST", { spaceId, content: "Ordinary client post" }, 2); assert.equal(clientPostResponse.status, 200);
    const clientPost = await clientPostResponse.json();
    assert.equal((await request(`${root}/${clientPost.id}`, "PATCH", { content: "Ordinary client post", commentsClosed: true }, 2)).status, 400);

    assert.equal((await db.post.findUniqueOrThrow({ where: { id: clientPost.id } })).commentsClosed, false);
    await db.space.update({ where: { id: spaceId }, data: { isHostOnly: true } });
    assert.equal((await request(root, "POST", { spaceId, content: "Host announcement", commentsClosed: true }, 1)).status, 200, "Superadmin can publish a closed host-only announcement");
    // Hold the close transaction open; a concurrent helper call must wait on its
    // row lock, then reject once closure commits, including stale UI submissions.
    let locked!: () => void, release!: () => void;
    const lockedSignal = new Promise<void>(resolve => { locked = resolve; });
    const releaseSignal = new Promise<void>(resolve => { release = resolve; });
    const closing = db.$transaction(async tx => { await tx.post.update({ where: { id: post.id }, data: { commentsClosed: true } }); locked(); await releaseSignal; }, { timeout: 10_000 });
    await lockedSignal;
    let settled = false;
    const attempted = addComment(post.id, users[2], "Concurrent stale reply").then(() => ({ error: null }), error => ({ error })).finally(() => { settled = true; });
    await new Promise(resolve => setTimeout(resolve, 100)); assert.equal(settled, false, "Reply waits for the setting transaction"); release(); await closing;
    const result = await attempted; assert(result.error instanceof CommentsClosedError);
    console.log("PASS: admin/superadmin create/close/reopen, member/coach/outsider/anonymous protection, stale and nested reply denial, preserved comments, ordinary client posts, host-only superadmin posting, concurrent row-lock enforcement. Temporary private fixtures only; no emails sent.");
  } finally {
    await db.$disconnect();
    if (spaceId) await db.space.deleteMany({ where: { id: spaceId } });
    for (const id of users) await db.auditLog.deleteMany({ where: { OR: [{ userId: id }, { metadata: { path: ["targetUserId"], equals: id } }] } });

    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
