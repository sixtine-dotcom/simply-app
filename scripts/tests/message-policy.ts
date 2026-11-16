import assert from "node:assert/strict";
import { test } from "node:test";
import { canDirectMessage, MESSAGE_TEAM_ROLES } from "../../src/lib/message-policy";

const client = { id: "client", role: "CLIENT", tenantId: "simply" };
const student = { id: "student", role: "STUDENT", tenantId: "simply" };

test("participants cannot privately message one another", () => {
  assert.equal(canDirectMessage(client, student), false);
  assert.equal(canDirectMessage(student, client), false);
  assert.equal(canDirectMessage(client, { ...client, id: "another-client" }), false);
});

test("team members can initiate a private message and participants can reply", () => {
  for (const role of MESSAGE_TEAM_ROLES) {
    const teamMember = { id: "team", role, tenantId: "simply" };
    assert.equal(canDirectMessage(teamMember, client), true);
    assert.equal(canDirectMessage(client, teamMember), true);
  }
});

test("deleted users, other tenants, self conversations and unknown roles are refused", () => {
  const admin = { id: "admin", role: "ADMIN", tenantId: "simply" };
  assert.equal(canDirectMessage(client, { ...admin, tenantId: "other" }), false);
  assert.equal(canDirectMessage({ ...client, deletedAt: new Date() }, admin), false);
  assert.equal(canDirectMessage(client, { ...admin, deletedAt: new Date() }), false);
  assert.equal(canDirectMessage(admin, admin), false);
  assert.equal(canDirectMessage(client, { ...student, role: "UNKNOWN" }), false);
});
