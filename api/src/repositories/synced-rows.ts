import type { Database } from '../db/database.ts';
import type { PulledRow, RowFields, SyncedTableName } from '../types/sync.ts';

/*
 * SQL for the six synced tables. They all work the same way, so one set of functions handles
 * them, driven by the column lists below.
 *
 * Table and column names are built into the SQL from these fixed lists, never from requests.
 * Every value from a request goes in as a $ parameter.
 *
 * Every write to these tables must happen inside a push transaction that holds the household
 * lock (see services/sync.ts), so change numbers become visible in order.
 */

type ColumnMap<Name extends SyncedTableName> = { [Field in keyof RowFields<Name>]-?: string };

const Columns: { [Name in SyncedTableName]: { table: string; columns: ColumnMap<Name> } } = {
  recipes: {
    table: 'recipes',
    columns: {
      name: 'name',
      category: 'category',
      area: 'area',
      instructions: 'instructions',
      thumbnailUrl: 'thumbnail_url',
      youtubeUrl: 'youtube_url',
      sourceUrl: 'source_url',
    },
  },
  recipeIngredients: {
    table: 'recipe_ingredients',
    columns: {
      recipeId: 'recipe_id',
      position: 'position',
      ingredientName: 'ingredient_name',
      measure: 'measure',
    },
  },
  mealPlanEntries: {
    table: 'meal_plan_entries',
    columns: { date: 'date', recipeId: 'recipe_id' },
  },
  shoppingLists: {
    table: 'shopping_lists',
    columns: { name: 'name', startDate: 'start_date', endDate: 'end_date' },
  },
  shoppingListItems: {
    table: 'shopping_list_items',
    columns: {
      shoppingListId: 'shopping_list_id',
      ingredientName: 'ingredient_name',
      measure: 'measure',
      recipeId: 'recipe_id',
      isChecked: 'is_checked',
    },
  },
  pantryItems: {
    table: 'pantry_items',
    columns: { ingredientName: 'ingredient_name' },
  },
};

/** Timestamps as ISO 8601 UTC strings with milliseconds, like JavaScript's toISOString(). */
function isoTimestamp(column: string): string {
  return `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
}

/**
 * Rows of one table changed after `since`, oldest change first. Columns are renamed in SQL to
 * the API's field names, so rows come back in the shape the API sends.
 */
export async function findChangedRows<Name extends SyncedTableName>(
  db: Database,
  name: Name,
  householdId: string,
  since: number,
  limit: number
): Promise<PulledRow<Name>[]> {
  const { table, columns } = Columns[name];
  const fields = Object.entries<string>(columns).map(([field, column]) => `${column} AS "${field}"`);
  const result = await db.query<PulledRow<Name>>(
    `SELECT id, ${fields.join(', ')},
       ${isoTimestamp('created_at')} AS "createdAt",
       ${isoTimestamp('updated_at')} AS "updatedAt",
       ${isoTimestamp('deleted_at')} AS "deletedAt",
       change_number AS "changeNumber"
     FROM ${table}
     WHERE household_id = $1 AND change_number > $2
     ORDER BY change_number
     LIMIT $3`,
    [householdId, since, limit]
  );
  return result.rows;
}

export type StoredRowState = {
  isDeleted: boolean;
  changeNumber: number;
};

/** The row's current state, locked until the transaction ends. `null` if it doesn't exist. */
export async function lockRow(
  db: Database,
  name: SyncedTableName,
  householdId: string,
  id: string
): Promise<StoredRowState | null> {
  const result = await db.query<{ is_deleted: boolean; change_number: number }>(
    `SELECT deleted_at IS NOT NULL AS is_deleted, change_number FROM ${Columns[name].table}
     WHERE household_id = $1 AND id = $2
     FOR UPDATE`,
    [householdId, id]
  );
  const row = result.rows[0];
  return row ? { isDeleted: row.is_deleted, changeNumber: row.change_number } : null;
}

/**
 * A row's data fields by their API names, e.g. `{ ingredientName: 'Garlic' }`. Already checked
 * by the route's Zod schema. Only fields in the table's column list are saved.
 */
export type FieldValues = Record<string, unknown>;

export async function insertRow(
  db: Database,
  name: SyncedTableName,
  householdId: string,
  id: string,
  fields: FieldValues
): Promise<void> {
  const { table, columns } = Columns[name];
  const entries = columnValues(columns, fields);
  const placeholders = entries.map((_, index) => `$${index + 3}`);
  await db.query(
    `INSERT INTO ${table} (household_id, id, ${entries.map(([column]) => column).join(', ')})
     VALUES ($1, $2, ${placeholders.join(', ')})`,
    [householdId, id, ...entries.map(([, value]) => value)]
  );
}

/** Overwrites the row's fields, and restores it if it was deleted. */
export async function updateRow(
  db: Database,
  name: SyncedTableName,
  householdId: string,
  id: string,
  fields: FieldValues
): Promise<void> {
  const { table, columns } = Columns[name];
  const entries = columnValues(columns, fields);
  const assignments = entries.map(([column], index) => `${column} = $${index + 3}`);
  await db.query(
    `UPDATE ${table} SET ${assignments.join(', ')}, deleted_at = NULL
     WHERE household_id = $1 AND id = $2`,
    [householdId, id, ...entries.map(([, value]) => value)]
  );
}

/** Soft-deletes the row, so other devices learn about the deletion when they pull. */
export async function softDeleteRow(
  db: Database,
  name: SyncedTableName,
  householdId: string,
  id: string
): Promise<void> {
  await db.query(
    `UPDATE ${Columns[name].table} SET deleted_at = now()
     WHERE household_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [householdId, id]
  );
}

/** [column, value] pairs for every column of the table, in the column list's order. */
function columnValues(columns: Record<string, string>, fields: FieldValues): [string, unknown][] {
  return Object.entries(columns).map(([field, column]) => [column, fields[field] ?? null]);
}
