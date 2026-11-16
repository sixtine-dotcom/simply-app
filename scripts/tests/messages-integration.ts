// Local API regression check. Creates and removes only uniquely named test users/conversations.
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), true);

async function main() {
  const base = process.env.MESSAGES_TEST_BASE_URL || "http://localhost:3000";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Use a local test server");
  const { db } = await import("../../src/lib/db");
  const { getMessagingContacts, getConversation, getConversationMessages, getUserConversations, sendMessage } = await import("../../src/lib/messages");
  const { MessageAccessError } = await import("../../src/lib/message-policy");
  const admin = await db.user.findFirstOrThrow({ where: { role: { in: ["ADMIN", "SUPERADMIN"] }, tenantId: { not: null }, deletedAt: null } });
  const batch = `message-test-${randomUUID()}`;
  const ids: string[] = [];
  const conversations: string[] = [];
  const cookies = new Map<string, string>();
  async function user(role: "ADMIN" | "CLIENT" | "STUDENT" | "COACH", name: string, tenantId = admin.tenantId) {
    const record = await db.user.create({ data: { email: `${batch}-${name}@example.invalid`, firstName: `${batch}-${name}`, lastName: "Test", role, tenantId } });
    ids.push(record.id);
    const token = randomBytes(32).toString("hex");
    await db.authSession.create({ data: { userId: record.id, token: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 3600000) } });
    cookies.set(record.id, `simply_session=${token}`);
    return record;
  }
  function request(userId: string | null, path: string, data?: unknown) {
    return fetch(`${base}/api/messages/conversations${path}`, {
      method: data === undefined ? "GET" : "POST",
      headers: { ...(userId ? { cookie: cookies.get(userId)! } : {}), ...(data === undefined ? {} : { "content-type": "application/json" }) },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }
  try {
    const client = await user("CLIENT", "client");
    const peer = await user("STUDENT", "peer");
    const team = await user("ADMIN", "admin");
    const coach = await user("COACH", "coach");
    const foreign = await user("ADMIN", "foreign", null);
    assert.equal((await request(null, "")).status, 401);
    assert.equal((await request(client.id, "", { userId: peer.id })).status, 403);
    assert.equal((await request(team.id, "", { userId: foreign.id })).status, 403);
    assert.equal((await request(client.id, "", { userId: "missing-user" })).status, 403);

    const contacts = await getMessagingContacts(client.id);
    assert.ok(contacts.some((contact) => contact.id === team.id));
    assert.ok(!contacts.some((contact) => contact.id === peer.id || contact.id === foreign.id));
    assert.ok((await getMessagingContacts(team.id)).some((contact) => contact.id === client.id));

    const legacy = await db.conversation.create({ data: { participants: { create: [{ userId: client.id }, { userId: peer.id }] }, messages: { create: { senderId: client.id, content: "Historic test peer message" } } } });
    conversations.push(legacy.id);
    assert.equal(await getConversation(legacy.id, client.id), null);
    await assert.rejects(() => getConversationMessages(legacy.id, client.id), MessageAccessError);
    await assert.rejects(() => sendMessage(legacy.id, client.id, "Must never be saved"), MessageAccessError);
    assert.ok(!(await getUserConversations(client.id)).some((entry) => entry.id === legacy.id));
    assert.equal((await request(client.id, `/${legacy.id}/messages`)).status, 403);
    assert.equal((await request(client.id, `/${legacy.id}/messages`, { content: "Blocked" })).status, 403);
    assert.equal(await db.message.count({ where: { conversationId: legacy.id } }), 1);

    const group = await db.conversation.create({ data: { participants: { create: [{ userId: team.id }, { userId: client.id }, { userId: peer.id }] } } });
    conversations.push(group.id);
    assert.equal((await request(client.id, `/${group.id}/messages`, { content: "No private groups" })).status, 403);
    assert.equal((await request(team.id, `/${group.id}/messages`)).status, 403);

    const created = await request(team.id, "", { userId: client.id });
    assert.equal(created.status, 200);
    const { conversationId } = await created.json();
    conversations.push(conversationId);
    assert.equal((await request(team.id, `/${conversationId}/messages`, { content: "Administrator test message" })).status, 200);
    assert.equal((await request(client.id, `/${conversationId}/messages`, { content: "Participant test reply" })).status, 200);
    const history = await request(client.id, `/${conversationId}/messages`);
    assert.equal(history.status, 200);
    assert.equal((await history.json()).messages.length, 2);
    assert.equal((await request(peer.id, `/${conversationId}/messages`)).status, 403);
    const listed = await (await request(client.id, "")).json();
    assert.ok(listed.some((entry: { id: string }) => entry.id === conversationId));
    assert.ok(!listed.some((entry: { id: string }) => entry.id === legacy.id));

    const coached = await request(client.id, "", { userId: coach.id });
    assert.equal(coached.status, 200);
    conversations.push((await coached.json()).conversationId);

    await db.user.update({ where: { id: team.id }, data: { role: "CLIENT" } });
    assert.equal((await request(client.id, `/${conversationId}/messages`)).status, 403);
    assert.equal((await request(team.id, `/${conversationId}/messages`, { content: "Role revoked" })).status, 403);
    console.log("Passed: peer creation/history/sending blocked; admin initiation and participant replies work; existing peer chats preserved but hidden; tenant isolation, membership and current roles enforced.");
  } finally {
    await db.conversation.deleteMany({ where: { id: { in: conversations } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
