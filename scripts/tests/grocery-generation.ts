import assert from "node:assert/strict";
async function main() {
  let saved: any;
  (globalThis as any).prisma = {
    recipe: { findMany: async () => [
      { id: "r1", ingredients: [{ ingredient: "Havermout", amount: "150", unit: "g" }, { ingredient: "Melk", amount: "0,5", unit: "liter" }, { ingredient: "Peper", amount: "snufje", unit: "" }] },
      { id: "r2", ingredients: [{ ingredient: "havermout", amount: 50, unit: "g" }, { ingredient: "Melk", amount: "0.25", unit: "liter" }, { ingredient: "Melk", amount: "100", unit: "ml" }, { ingredient: "Peper", amount: "naar smaak", unit: "" }] },
    ] },
    groceryList: { create: async (args: any) => { saved = args.data; return saved; } },
  };
  const { generateGroceryList } = await import("../../src/lib/recipes");
  await generateGroceryList("fixture", ["r1", "r2"], "Deze week");
  assert.equal(saved.name, "Deze week");
  const items = saved.items.create;
  assert.equal(items.find((item: any) => item.ingredient === "Havermout").amount, "200");
  assert.equal(items.find((item: any) => item.unit === "liter").amount, "0,75");
  assert.equal(items.find((item: any) => item.unit === "ml").amount, "100");
  assert.equal(items.find((item: any) => item.ingredient === "Peper").amount, "snufje + naar smaak");
  assert.equal(items.find((item: any) => item.unit === "ml").recipeId, "r2");
  assert.equal(items.length, 4);
  console.log("PASS: ingredient quantities combine without losing amounts; decimal formats, distinct units, textual amounts and recipe references. No real database used.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
