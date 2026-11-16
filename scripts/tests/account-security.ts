import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { db } from "../../src/lib/db";
import { hashPassword, verifyPassword } from "../../src/lib/passwords";
import { safeLoginDestination } from "../../src/lib/auth-navigation";
import { takeAuthAttempt } from "../../src/lib/auth-rate-limit";
import { deletionEmailDigest, eraseRequestedClientAccount, deletionResources } from "../../src/lib/account-deletion";

async function main() {
  const password = "Test-only secret with spaces!";
  const hash = await hashPassword(password);
  assert(await verifyPassword(password, hash));
  assert(!await verifyPassword("wrong", hash));
  assert(!await verifyPassword(password, null));
  assert(!await verifyPassword(password, "malformed"));
  assert.notEqual(await hashPassword(password), hash);
  for (const path of ["https://evil.example", "//evil.example", "/\\evil.example", "/\n/evil.example"]) assert.equal(safeLoginDestination(path), "/");
  assert.equal(safeLoginDestination("/settings?tab=account"), "/settings?tab=account");
  const fixture = `security-test-${randomUUID()}`;
  const email = `${fixture}@example.invalid`;
  const scope = "security-fixture";
  const key = createHash("sha256").update(`${scope}:${fixture}`).digest("hex");
  let clientId: string | undefined, coachId: string | undefined, requestId: string | undefined, conversationId: string | undefined;
  try {
    const attempts = await Promise.all(Array.from({ length: 12 }, () => takeAuthAttempt(scope, fixture, 5)));
    assert.equal(attempts.filter(Boolean).length, 5, "Atomic limit across concurrent requests");
    await db.authRateLimit.update({ where: { key }, data: { resetAt: new Date(0) } });
    assert(await takeAuthAttempt(scope, fixture, 5), "Expired windows reset");
    const client = await db.user.create({ data: { email, firstName: "Temporary", lastName: "Security fixture", role: "CLIENT" } }); clientId = client.id;
    const coach = await db.user.create({ data: { email: `coach-${email}`, firstName: "Temporary", lastName: "Coach fixture", role: "COACH" } }); coachId = coach.id;
    const conversation = await db.conversation.create({ data: { participants: { create: [{ userId: client.id }, { userId: coach.id }] }, messages: { create: { senderId: coach.id, content: "Synthetic private reply", voiceUrl: "/uploads/security-fixture.mp3" } } } }); conversationId = conversation.id;
    await db.authSession.create({ data: { userId: client.id, token: fixture, expiresAt: new Date(Date.now() + 60_000) } });
    await db.verificationToken.create({ data: { email, token: fixture, type: "magic_link", expiresAt: new Date(Date.now() + 60_000) } });
    await db.coachingSession.create({ data: { clientId: client.id, coachId: coach.id, scheduledAt: new Date(), recordings: { create: { dailyRecordingId: fixture, transcript: "Synthetic private transcript" } } } });
    const request = await db.accountDeletionRequest.create({ data: { userId: client.id, email, emailDigest: deletionEmailDigest(email), shopifyOrderIds: [fixture] } }); requestId = request.id;
    assert((await deletionResources(client.id)).files.includes("/uploads/security-fixture.mp3"), "Review includes coach's private voice replies");
    await assert.rejects(eraseRequestedClientAccount(request.id, email, false));
    await assert.rejects(eraseRequestedClientAccount(request.id, "wrong@example.invalid", true));
    assert(await db.user.findUnique({ where: { id: client.id } }), "Rejected confirmation retains account");
    const result = await eraseRequestedClientAccount(request.id, email, true);
    assert.equal(result.confirmationEmail, email);
    assert.equal(await db.user.findUnique({ where: { id: client.id } }), null);
    assert.equal(await db.coachingRecording.count({ where: { dailyRecordingId: fixture } }), 0, "Private recording transcripts are removed");
    assert.equal(await db.authSession.count({ where: { userId: client.id } }), 0);
    assert.equal(await db.verificationToken.count({ where: { email } }), 0);
    assert.equal(await db.conversation.findUnique({ where: { id: conversation.id } }), null);
    const receipt = await db.accountDeletionRequest.findUniqueOrThrow({ where: { id: request.id } });
    assert.equal(receipt.status, "COMPLETED"); assert.equal(receipt.email, null); assert.equal(receipt.userId, null);
    assert((await eraseRequestedClientAccount(request.id, email, true)).alreadyCompleted);
    assert(await db.user.findUnique({ where: { id: coach.id } }), "Coach account preserved");
    console.log("PASS: password hashing, redirect safety, concurrent rate limits, external review and confirmation guards, account/session/token/private-chat erasure, anonymized receipt, idempotence. Only temporary fixtures used; no emails sent.");
  } finally {
    if (conversationId) await db.conversation.deleteMany({ where: { id: conversationId } });
    await db.verificationToken.deleteMany({ where: { email } });
    if (requestId) { await db.auditLog.deleteMany({ where: { action: "privacy.account_erased", metadata: { path: ["requestId"], equals: requestId } } }); await db.accountDeletionRequest.deleteMany({ where: { id: requestId } }); }
    await db.coachingRecording.deleteMany({ where: { dailyRecordingId: fixture } });
    await db.user.deleteMany({ where: { id: { in: [clientId, coachId].filter((id): id is string => !!id) } } });
    await db.authRateLimit.deleteMany({ where: { key } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
