import type { Database } from '../db/database.ts';
import type { HouseholdSummary } from '../types/account.ts';

export async function insertHousehold(
  db: Database,
  household: { id: string; name: string; createdBy: string }
): Promise<HouseholdSummary> {
  const result = await db.query<HouseholdSummary>(
    'INSERT INTO households (id, name, created_by) VALUES ($1, $2, $3) RETURNING id, name',
    [household.id, household.name, household.createdBy]
  );
  return result.rows[0]!;
}

export async function findHouseholdSummary(
  db: Database,
  id: string
): Promise<HouseholdSummary | null> {
  const result = await db.query<HouseholdSummary>('SELECT id, name FROM households WHERE id = $1', [
    id,
  ]);
  return result.rows[0] ?? null;
}

export async function findHousehold(
  db: Database,
  id: string
): Promise<(HouseholdSummary & { createdBy: string }) | null> {
  const result = await db.query<{ id: string; name: string; created_by: string }>(
    'SELECT id, name, created_by FROM households WHERE id = $1',
    [id]
  );
  const row = result.rows[0];
  return row ? { id: row.id, name: row.name, createdBy: row.created_by } : null;
}

export async function renameHousehold(db: Database, id: string, name: string): Promise<void> {
  await db.query('UPDATE households SET name = $2 WHERE id = $1', [id, name]);
}

/** Whether the household has any data that isn't deleted: recipes, plan, lists or pantry. */
export async function householdHasData(db: Database, id: string): Promise<boolean> {
  const result = await db.query<{ has_data: boolean }>(
    `SELECT
       EXISTS (SELECT 1 FROM recipes             WHERE household_id = $1 AND deleted_at IS NULL)
    OR EXISTS (SELECT 1 FROM meal_plan_entries   WHERE household_id = $1 AND deleted_at IS NULL)
    OR EXISTS (SELECT 1 FROM shopping_list_items WHERE household_id = $1 AND deleted_at IS NULL)
    OR EXISTS (SELECT 1 FROM pantry_items        WHERE household_id = $1 AND deleted_at IS NULL)
       AS has_data`,
    [id]
  );
  return result.rows[0]!.has_data;
}

/**
 * Reads the household's creator and locks the household until the transaction ends, so two
 * members leaving at the same time can't both decide they were the last one.
 */
export async function lockHousehold(
  db: Database,
  id: string
): Promise<{ id: string; createdBy: string } | null> {
  const result = await db.query<{ id: string; created_by: string }>(
    'SELECT id, created_by FROM households WHERE id = $1 FOR UPDATE',
    [id]
  );
  const row = result.rows[0];
  return row ? { id: row.id, createdBy: row.created_by } : null;
}

export async function setHouseholdCreator(
  db: Database,
  householdId: string,
  userId: string
): Promise<void> {
  await db.query('UPDATE households SET created_by = $2 WHERE id = $1', [householdId, userId]);
}

/** Deletes the household and, through ON DELETE CASCADE, all its data and invites. */
export async function deleteHousehold(db: Database, id: string): Promise<void> {
  await db.query('DELETE FROM households WHERE id = $1', [id]);
}
