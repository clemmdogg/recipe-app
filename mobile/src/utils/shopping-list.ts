import type { DateKey } from '@/utils/dates';

/** One ingredient of one planned dinner. */
export type PlannedIngredient = {
  date: DateKey;
  recipeName: string;
  name: string;
  measure: string;
};

/** A line the user ticked off or added by hand, as stored in the database. */
export type StoredShoppingItem = {
  name: string;
  isChecked: boolean;
};

/** Where an ingredient is needed: "3 cloves" for "Pasta" on Monday. */
export type IngredientUse = {
  measure: string;
  recipeName: string;
  date: DateKey;
};

export type ShoppingLine = {
  /** Lowercased name. Ingredients match case-insensitively. */
  key: string;
  name: string;
  /** Every use in the week's dinners, listed separately (measures are never summed). */
  uses: IngredientUse[];
  /** Needed by a planned dinner, as opposed to only added by hand. */
  isPlanned: boolean;
  /** Has a stored row: ticked off, added by hand, or wanted despite being in the pantry. */
  isStored: boolean;
};

export type ShoppingList = {
  toBuy: ShoppingLine[];
  inCart: ShoppingLine[];
  /** Needed, but already in the pantry, so skipped. */
  atHome: ShoppingLine[];
};

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
