import type { PlannedIngredient, ShoppingLine, ShoppingList, StoredShoppingItem } from '@/types/shopping-list';

export const ingredientKey = (name: string) => name.trim().toLowerCase();

/**
 * Builds a week's shopping list from the planned dinners' ingredients, the pantry, and what the
 * user stored (ticked off or added). The list is derived, so it follows changes to the plan.
 */
export function buildShoppingList(
  planned: PlannedIngredient[],
  stored: StoredShoppingItem[],
  pantryNames: string[]
): ShoppingList {
  const lines = new Map<string, ShoppingLine>();
  const lineFor = (name: string) => {
    const key = ingredientKey(name);
    let line = lines.get(key);
    if (!line) {
      line = { key, name: name.trim(), uses: [], isPlanned: false, isStored: false };
      lines.set(key, line);
    }
    return line;
  };

  for (const ingredient of planned) {
    const line = lineFor(ingredient.name);
    line.isPlanned = true;
    line.uses.push({ measure: ingredient.measure, recipeName: ingredient.recipeName, date: ingredient.date });
  }

  const checked = new Set<string>();
  for (const item of stored) {
    const line = lineFor(item.name);
    line.isStored = true;
    if (item.isChecked) {
      checked.add(line.key);
    }
  }

  const inPantry = new Set(pantryNames.map(ingredientKey));
  const list: ShoppingList = { toBuy: [], inCart: [], atHome: [] };
  for (const line of [...lines.values()].sort((a, b) => a.key.localeCompare(b.key))) {
    if (checked.has(line.key)) {
      list.inCart.push(line);
    } else if (inPantry.has(line.key) && !line.isStored) {
      list.atHome.push(line);
    } else {
      list.toBuy.push(line);
    }
  }
  return list;
}
