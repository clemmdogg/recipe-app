import type { Database } from '@/db/types';
import type { PantryItem } from '@/types/pantry';
import { IdNamespaces, nameBasedUuid } from '@/utils/ids';

/** Pantry items in alphabetical order, ignoring case. */
export async function getPantryItems(db: Database): Promise<PantryItem[]> {
  return db.getAllAsync<PantryItem>(
    `SELECT id, ingredient_name AS name FROM pantry_items
     WHERE deleted_at IS NULL
     ORDER BY ingredient_name COLLATE NOCASE`
  );
}

/**
 * Adds an ingredient to the pantry. Does nothing if it's already there (in any letter case),
 * and restores the same row if it was removed before. The id is derived from the name, so
 * the same ingredient added on two devices becomes one row when synced.
 */
export async function addToPantry(db: Database, name: string, now = new Date()): Promise<void> {
  const trimmed = name.trim();
  if (trimmed === '') {
    throw new Error('An ingredient name is required');
  }
  const id = await pantryItemId(trimmed);
  const timestamp = now.toISOString();
  await db.runAsync(
    `INSERT INTO pantry_items (id, ingredient_name, created_at, updated_at)
     VALUES ($id, $name, $now, $now)
     ON CONFLICT (id) DO UPDATE SET
       ingredient_name = excluded.ingredient_name,
       updated_at = excluded.updated_at,
       deleted_at = NULL
     WHERE pantry_items.deleted_at IS NOT NULL`,
    { $id: id, $name: trimmed, $now: timestamp }
  );
}

/** Soft-deletes a pantry item. */
export async function removeFromPantry(db: Database, id: string, now = new Date()): Promise<void> {
  const timestamp = now.toISOString();
  await db.runAsync(
    'UPDATE pantry_items SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    timestamp,
    timestamp,
    id
  );
}

export function pantryItemId(name: string): Promise<string> {
  return nameBasedUuid(IdNamespaces.pantryItem, name.trim().toLowerCase());
}
