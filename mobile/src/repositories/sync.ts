import type { Database } from '@/db/types';
import type { PulledRow, PushRow, RowFields, SyncChanges, SyncTableName } from '@/types/sync';
import { SyncTableNames } from '@/types/sync';

/*
 * SQL for syncing the local database with the API. The six synced tables work the same way,
 * so one set of functions handles them, driven by the column lists below. Table and column
 * names come only from these lists; values always go in as parameters.
 *
 * `needs_push` is set by triggers (migration 003) whenever the app changes a row. Rows written
 * here from a pull always get a new `change_number`, which is how the triggers leave them alone.
 */

type TableColumns = {
  table: string;
  /** API field name → local column. */
  columns: Record<string, string>;
  /** Fields stored as INTEGER 0/1 locally but sent as true/false. */
  booleans?: string[];
};

const Tables: Record<SyncTableName, TableColumns> = {
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
    booleans: ['isChecked'],
  },
  pantryItems: {
    table: 'pantry_items',
    columns: { ingredientName: 'ingredient_name' },
  },
};

/** A row to push, with the `updatedAt` it had when read, to tell later edits apart. */
export type PendingRow = {
  table: SyncTableName;
  row: PushRow;
  updatedAt: string;
};

/** Up to `limit` rows this device changed and hasn't uploaded, parents first. */
export async function getRowsToPush(db: Database, limit: number): Promise<PendingRow[]> {
  const pending: PendingRow[] = [];
  for (const name of SyncTableNames) {
    if (pending.length >= limit) {
      break;
    }
    const { table, columns, booleans = [] } = Tables[name];
    const fields = Object.entries(columns).map(([field, column]) => `${column} AS "${field}"`);
    const rows = await db.getAllAsync<RowFields & { id: string; isDeleted: number; changeNumber: number | null; updatedAt: string }>(
      `SELECT id, ${fields.join(', ')},
         deleted_at IS NOT NULL AS isDeleted, change_number AS changeNumber, updated_at AS updatedAt
       FROM ${table}
       WHERE needs_push = 1
       ORDER BY updated_at
       LIMIT ?`,
      limit - pending.length
    );
    for (const { isDeleted, changeNumber, updatedAt, ...row } of rows) {
      for (const field of booleans) {
        row[field] = row[field] === 1;
      }
      pending.push({
        table: name,
        row: { ...row, deleted: isDeleted === 1, baseChangeNumber: changeNumber },
        updatedAt,
      });
    }
  }
  return pending;
}

/** Whether anything on this device hasn't been uploaded yet. */
export async function hasRowsToPush(db: Database): Promise<boolean> {
  const checks = SyncTableNames.map(
    (name) => `EXISTS (SELECT 1 FROM ${Tables[name].table} WHERE needs_push = 1)`
  );
  const row = await db.getFirstAsync<{ pending: number }>(`SELECT ${checks.join(' OR ')} AS pending`);
  return row?.pending === 1;
}

/**
 * Clears the upload mark after a push, unless the row changed again since it was read: then the
 * newer change still needs uploading.
 */
export async function markPushed(db: Database, pending: PendingRow): Promise<void> {
  await db.runAsync(
    `UPDATE ${Tables[pending.table].table} SET needs_push = 0
     WHERE id = ? AND updated_at = ? AND needs_push = 1`,
    pending.row.id,
    pending.updatedAt
  );
}

/**
 * The server rejected this device's change because someone deleted the row first (a delete beats
 * an edit). Delete it here too, and don't try to upload it again.
 */
export async function acceptServerDelete(
  db: Database,
  name: SyncTableName,
  id: string,
  now = new Date()
): Promise<void> {
  const timestamp = now.toISOString();
  await db.runAsync(
    `UPDATE ${Tables[name].table}
     SET deleted_at = COALESCE(deleted_at, ?), updated_at = ?, needs_push = 0
     WHERE id = ?`,
    timestamp,
    timestamp,
    id
  );
}

/**
 * Saves pulled rows and the new cursor, all in one transaction. A row this device still needs to
 * upload is left alone: its own change is pushed next, and the server decides.
 * Rows can arrive in any order across pages (an ingredient before its recipe), so foreign keys
 * are only checked when the transaction commits.
 */
export async function applyPulledRows(
  db: Database,
  changes: SyncChanges<PulledRow>,
  cursor: number
): Promise<number> {
  let applied = 0;
  await db.withTransactionAsync(async () => {
    await db.execAsync('PRAGMA defer_foreign_keys = ON');
    for (const name of SyncTableNames) {
      for (const row of changes[name] ?? []) {
        applied += await upsertPulledRow(db, name, row);
      }
    }
    await setCursor(db, cursor);
  });
  return applied;
}

async function upsertPulledRow(db: Database, name: SyncTableName, row: PulledRow): Promise<number> {
  const { table, columns, booleans = [] } = Tables[name];
  const fields = Object.keys(columns);
  const columnNames = [...fields.map((field) => columns[field]), 'created_at', 'updated_at', 'deleted_at', 'change_number'];
  const values = [
    ...fields.map((field) => (booleans.includes(field) ? Number(row[field]) : row[field] ?? null)),
    row.createdAt,
    row.updatedAt,
    row.deletedAt,
    row.changeNumber,
  ];
  const assignments = columnNames.map((column) => `${column} = excluded.${column}`);
  const result = await db.runAsync(
    `INSERT INTO ${table} (id, ${columnNames.join(', ')}, needs_push)
     VALUES (?, ${columnNames.map(() => '?').join(', ')}, 0)
     ON CONFLICT (id) DO UPDATE SET ${assignments.join(', ')}
     WHERE ${table}.needs_push = 0 AND ${table}.change_number IS NOT excluded.change_number`,
    row.id,
    ...values
  );
  return result.changes;
}

const CursorKey = 'pull_cursor';

/** The change number up to which this device has pulled. 0 before the first sync. */
export async function getCursor(db: Database): Promise<number> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM sync_state WHERE key = ?', CursorKey);
  return row ? Number(row.value) : 0;
}

async function setCursor(db: Database, cursor: number): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_state (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    CursorKey,
    String(cursor)
  );
}
