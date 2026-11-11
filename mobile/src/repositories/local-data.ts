import type { Database } from '@/db/types';

/*
 * The local database only ever holds one household's data. These functions record which one,
 * and empty it when the user signs out or ends up in another household.
 */

const HouseholdKey = 'household_id';

/**
 * Stored as the household after clearing. It matches no real household, so anything that lands
 * in the database afterwards (e.g. from a sync that was still running at sign-out) is deleted at
 * the next sign-in instead of being uploaded as data from before login.
 */
const ClearedMarker = '';

/** Children before parents, so foreign keys hold while deleting. */
const HouseholdTables = [
  'shopping_list_items',
  'shopping_lists',
  'meal_plan_entries',
  'recipe_ingredients',
  'recipes',
  'pantry_items',
] as const;

/**
 * The household the local data belongs to. null only for data from before login, which is the one
 * case where local data is uploaded to whichever household signs in.
 */
export async function getLocalHouseholdId(db: Database): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_state WHERE key = ?',
    HouseholdKey
  );
  return row?.value ?? null;
}

export async function setLocalHouseholdId(db: Database, householdId: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_state (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    HouseholdKey,
    householdId
  );
}

/**
 * Deletes all household data and sync bookkeeping from this device (really deleted, not soft:
 * the data stays safe on the server). The ingredient catalog is kept; it isn't household data.
 */
export async function clearHouseholdData(db: Database): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const table of HouseholdTables) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
    await db.runAsync('DELETE FROM sync_state');
    await db.runAsync('INSERT INTO sync_state (key, value) VALUES (?, ?)', HouseholdKey, ClearedMarker);
  });
}
