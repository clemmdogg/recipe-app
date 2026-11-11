/*
 * The shapes the API's sync endpoints use (GET and POST /v1/changes). See "4.4 Sync" in
 * api/docs/api-design.md. Field names are the API's camelCase names.
 */

/** The synced tables by their API names, in push order: parents before children. */
export const SyncTableNames = [
  'recipes',
  'recipeIngredients',
  'mealPlanEntries',
  'shoppingLists',
  'shoppingListItems',
  'pantryItems',
] as const;

export type SyncTableName = (typeof SyncTableNames)[number];

/** A row's own fields, e.g. `{ ingredientName: 'Garlic' }`. */
export type RowFields = Record<string, string | number | boolean | null>;

/** A row this device changed, as it is sent to the API. */
export type PushRow = RowFields & {
  id: string;
  deleted: boolean;
  /** The change number this device last pulled for the row; null if it never pulled it. */
  baseChangeNumber: number | null;
};

/** A row as the API sends it when pulling. */
export type PulledRow = RowFields & {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  changeNumber: number;
};

export type SyncChanges<Row> = Partial<Record<SyncTableName, Row[]>>;

export type PullResponse = {
  cursor: number;
  hasMore: boolean;
  changes: SyncChanges<PulledRow>;
};

export type PushResponse = {
  applied: number;
  rejected: { table: SyncTableName; id: string; reason: 'deleted_on_server' }[];
};
