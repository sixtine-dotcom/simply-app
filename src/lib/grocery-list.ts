import { z } from "zod";

export interface GroceryItem {
  id: string;
  ingredient: string;
  amount: string | null;
  unit: string | null;
  isChecked: boolean;
}
export interface GroceryList {
  id: string;
  name: string;
  createdAt: string;
  items: GroceryItem[];
}
export const groceryName = z.string().trim().min(1, "Geef je lijst een naam.").max(100, "Gebruik maximaal 100 tekens.");
export const groceryItemFields = z.object({
  ingredient: z.string().trim().min(1).max(150),
  amount: z.string().trim().max(40).optional(),
  unit: z.string().trim().max(30).optional(),
}).strict();
export function groceryListText(list: GroceryList) {
  return [list.name, "", ...list.items.map(item => {
    const quantity = [item.amount, item.unit].filter(Boolean).join(" ");
    return `${item.isChecked ? "☑" : "☐"} ${item.ingredient}${quantity ? ` — ${quantity}` : ""}`;
  })].join("\n");
}
