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
