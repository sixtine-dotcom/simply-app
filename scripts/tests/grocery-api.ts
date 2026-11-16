import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../../src/lib/db";
import { groceryListText } from "../../src/lib/grocery-list";

// Run with the local app and its DATABASE_URL. Never target production HTTP.
const base = process.env.SIMPLY_TEST_BASE_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("This test only accepts a localhost base URL.");
async function main() {
  const userIds: string[] = [];
  const nonce = randomBytes(8).toString("hex");
  const tokens = [randomBytes(32).toString("hex"), randomBytes(32).toString("hex")];
  async function request(path: string, method = "GET", data?: unknown, account: number | null = 0) {
    return fetch(base + path, { method, redirect: "manual", headers: { ...(account !== null ? { Cookie: `simply_session=${tokens[account]}` } : {}), ...(data !== undefined ? { "Content-Type": "application/json" } : {}) }, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
  }
  try {
    for (const [index, token] of tokens.entries()) {
      const user = await db.user.create({ data: { email: `grocery-api-${nonce}-${index}@example.invalid`, firstName: "Temporary", lastName: "Grocery API fixture", role: "CLIENT" } });
      userIds.push(user.id);
      await db.auditLog.create({ data: { action: "user.created", metadata: { targetUserId: user.id } } });
      await db.authSession.create({ data: { userId: user.id, token: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 300_000) } });
    }
    const root = "/api/recipes/grocery-list";
    assert.equal((await request(root, "GET", undefined, null)).status, 401);
    assert.equal((await request(root, "POST", { name: " " })).status, 400);
    const created = await request(root, "POST", { name: " Mijn eigen lijst ", recipeIds: [] }); assert.equal(created.status, 200);
    const list = await created.json(); assert.equal(list.name, "Mijn eigen lijst"); assert.deepEqual(list.items, []);
    const listPath = `${root}/${list.id}`;
    assert.equal((await request(listPath, "PATCH", { name: "Andermans naam" }, 1)).status, 404);
    assert.equal((await request(listPath + "/items", "POST", { ingredient: "Niet van jou" }, 1)).status, 404);
    assert.equal((await request(listPath, "PATCH", { name: "Weekend" })).status, 200);
    assert.equal((await request(listPath + "/items", "POST", { ingredient: " " })).status, 400);
    assert.equal((await request(listPath + "/items", "POST", { ingredient: "a".repeat(151) })).status, 400);
    const added = await request(listPath + "/items", "POST", { ingredient: "Avocado", amount: "2", unit: "stuks" }); assert.equal(added.status, 201);
    const item = await added.json(); const itemPath = `${root}/items/${item.id}`;
    assert.equal((await request(itemPath, "PATCH", { isChecked: true }, 1)).status, 404);
    assert.equal((await request(itemPath, "DELETE", undefined, 1)).status, 404);
    assert.equal((await request(itemPath, "PATCH", { isChecked: "false" })).status, 400);
    assert.equal((await request(itemPath, "PATCH", {})).status, 400);
    assert.equal((await request(itemPath, "PATCH", { groceryListId: "other" })).status, 400);
    assert.equal((await request(itemPath, "PATCH", { ingredient: "Rijpe avocado", amount: "3", isChecked: true })).status, 200);
    const lists = await (await request(root)).json(); const saved = lists.find((entry: any) => entry.id === list.id);
    assert.equal(saved.name, "Weekend"); assert.equal(saved.items[0].ingredient, "Rijpe avocado"); assert.equal(saved.items[0].isChecked, true);
    assert.equal(groceryListText(saved), "Weekend\n\n☑ Rijpe avocado — 3 stuks");
    const others = await (await request(root, "GET", undefined, 1)).json(); assert(!others.some((entry: any) => entry.id === list.id));
    assert.equal((await request(itemPath, "PATCH", { isChecked: false })).status, 200);
    assert.equal((await request(itemPath, "DELETE")).status, 200);
    const afterDelete = await (await request(root)).json();
    assert.equal(afterDelete.find((entry: any) => entry.id === list.id).items.length, 0);
    console.log("PASS: own-list creation/rename/add/edit/check/uncheck/delete, persistent values, copy format, input validation, anonymous and cross-account isolation. Temporary fixtures only; no emails sent.");
  } finally {
    await db.$disconnect();
    for (const id of userIds) await db.auditLog.deleteMany({ where: { OR: [{ userId: id }, { metadata: { path: ["targetUserId"], equals: id } }] } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
