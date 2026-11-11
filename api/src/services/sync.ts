import pg from 'pg';

import { withTransaction, type Database, type DatabasePool } from '../db/database.ts';
import { ApiError } from '../errors.ts';
import { lockHousehold } from '../repositories/households.ts';
import {
  findChangedRows,
  insertRow,
  lockRow,
  softDeleteRow,
  updateRow,
  type FieldValues,
} from '../repositories/synced-rows.ts';
import type { AuthenticatedUser } from '../types/account.ts';
import {
  SyncedTableNames,
  type PullResponse,
  type PushRequest,
  type PushResponse,
  type SyncedTableName,
} from '../types/sync.ts';

/**
 * A pushed row of any table: its id, the device's sync fields and its data fields. Kept loose on
 * purpose (the route's Zod schema has already checked it), because a type per table makes
 * TypeScript work out every combination of tables and runs out of memory.
 */
type PushedRowOfAnyTable = FieldValues & {
  id: string;
  deleted: boolean;
  baseChangeNumber: number | null;
};

/**
 * The household's rows changed after `since`, at most `limit` of them, oldest change first.
 * The returned cursor is the change number of the last row included.
 */
export async function pullChanges(
  pool: DatabasePool,
  auth: AuthenticatedUser,
  since: number,
  limit: number
): Promise<PullResponse> {
  const find = <Name extends SyncedTableName>(name: Name) =>
    findChangedRows(pool, name, auth.householdId, since, limit + 1);

  // Each table returns its oldest `limit + 1` changes, so together they contain the household's
  // oldest `limit + 1` changes across all tables.
  const [recipes, recipeIngredients, mealPlanEntries, shoppingLists, shoppingListItems, pantryItems] =
    await Promise.all([
      find('recipes'),
      find('recipeIngredients'),
      find('mealPlanEntries'),
      find('shoppingLists'),
      find('shoppingListItems'),
      find('pantryItems'),
    ]);

  const changeNumbers = [
    recipes,
    recipeIngredients,
    mealPlanEntries,
    shoppingLists,
    shoppingListItems,
    pantryItems,
  ]
    .flat()
    .map((row) => row.changeNumber)
    .sort((a, b) => a - b);
  const hasMore = changeNumbers.length > limit;
  const included = changeNumbers.slice(0, limit);
  const cursor = included.at(-1) ?? since;
  const upToCursor = (row: { changeNumber: number }) => row.changeNumber <= cursor;

  return {
    cursor,
    hasMore,
    changes: {
      recipes: recipes.filter(upToCursor),
      recipeIngredients: recipeIngredients.filter(upToCursor),
      mealPlanEntries: mealPlanEntries.filter(upToCursor),
      shoppingLists: shoppingLists.filter(upToCursor),
      shoppingListItems: shoppingListItems.filter(upToCursor),
      pantryItems: pantryItems.filter(upToCursor),
    },
  };
}

/**
 * Saves a device's changed rows, all or nothing. Rows that lose a conflict are rejected, not
 * saved; the device gets the server's version on its next pull.
 */
export async function pushChanges(
  pool: DatabasePool,
  auth: AuthenticatedUser,
  changes: PushRequest['changes']
): Promise<PushResponse> {
  try {
    return await withTransaction(pool, async (db) => {
      // Pushes to the same household take turns. Otherwise a pull could see a later change
      // number before an earlier one is committed, and the device would skip the earlier one.
      await lockHousehold(db, auth.householdId);

      const result: PushResponse = { applied: 0, rejected: [] };
      for (const name of SyncedTableNames) {
        for (const row of changes[name] ?? []) {
          if (await applyRow(db, name, auth.householdId, row)) {
            result.applied += 1;
          } else {
            result.rejected.push({ table: name, id: row.id, reason: 'deleted_on_server' });
          }
        }
      }
      return result;
    });
  } catch (error) {
    throw toValidationError(error) ?? error;
  }
}

/**
 * Applies one row by the conflict rules in api/docs/api-design.md. Returns false when it is
 * rejected because it was deleted on the server after this device last saw it.
 */
async function applyRow(
  db: Database,
  name: SyncedTableName,
  householdId: string,
  row: PushedRowOfAnyTable
): Promise<boolean> {
  const { id, deleted, baseChangeNumber, ...rowFields } = row;
  const stored = await lockRow(db, name, householdId, id);

  if (!stored) {
    await insertRow(db, name, householdId, id, rowFields);
    // Created and deleted on the device before it was ever pushed. Keep it as a deleted row, not
    // nothing: other rows can still point to it, e.g. a plan entry for a recipe that was unsaved.
    if (deleted) {
      await softDeleteRow(db, name, householdId, id);
    }
    return true;
  }

  if (stored.isDeleted) {
    if (deleted) {
      return true;
    }
    // A delete the device hadn't seen beats its edit. If it had seen it, this is a restore.
    if (stored.changeNumber > (baseChangeNumber ?? 0)) {
      return false;
    }
    await updateRow(db, name, householdId, id, rowFields);
    return true;
  }

  // Last write wins: this push is the latest, so it overwrites.
  if (deleted) {
    await softDeleteRow(db, name, householdId, id);
  } else {
    await updateRow(db, name, householdId, id, rowFields);
  }
  return true;
}

/** Turns a broken database rule into a 400 the device can understand. */
function toValidationError(error: unknown): ApiError | null {
  if (!(error instanceof pg.DatabaseError)) {
    return null;
  }
  if (error.code === '23503') {
    return new ApiError(
      400,
      'validation_failed',
      `A change refers to a row that doesn't exist in your household (${error.table ?? 'unknown table'}). Push the row it refers to in the same or an earlier push.`
    );
  }
  if (error.code === '23505') {
    return new ApiError(
      400,
      'validation_failed',
      `A change clashes with another row in your household (${error.table ?? 'unknown table'}).`
    );
  }
  return null;
}
