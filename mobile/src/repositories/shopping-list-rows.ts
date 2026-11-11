import type { Database } from '@/db/types';
import { addDays, formatDayMonth, fromDateKey, toDateKey, type DateKey } from '@/utils/dates';
import { IdNamespaces, nameBasedUuid } from '@/utils/ids';
import { ingredientKey } from '@/utils/shopping-list';

/*
 * Row-level helpers for shopping lists, used by src/repositories/shopping-list.ts. Lists and lines have
 * name-based ids (week, ingredient), so the same line on two devices merges on sync.
 */

export function shoppingListId(weekStart: DateKey): Promise<string> {
  return nameBasedUuid(IdNamespaces.shoppingList, weekStart);
}

export async function shoppingItemId(weekStart: DateKey, name: string): Promise<string> {
  return nameBasedUuid(
    IdNamespaces.shoppingListItem,
    `${await shoppingListId(weekStart)}/${ingredientKey(name)}`
  );
}

/**
 * Creates or updates a line, restoring it if it was removed. With `onlyIfMissing`, a line
 * that is already on the list is left alone.
 */
export async function upsertItem(
  db: Database,
  weekStart: DateKey,
  name: string,
  isChecked: boolean,
  now: Date,
  { onlyIfMissing = false } = {}
): Promise<void> {
  const trimmed = name.trim();
  if (trimmed === '') {
    throw new Error('An ingredient name is required');
  }
  const listId = await ensureList(db, weekStart, now);
  await db.runAsync(
    `INSERT INTO shopping_list_items
       (id, shopping_list_id, ingredient_name, is_checked, created_at, updated_at)
     VALUES ($id, $listId, $name, $checked, $now, $now)
     ON CONFLICT (id) DO UPDATE SET
       is_checked = excluded.is_checked,
       updated_at = excluded.updated_at,
       deleted_at = NULL
     WHERE $onlyIfMissing = 0 OR shopping_list_items.deleted_at IS NOT NULL`,
    {
      $id: await shoppingItemId(weekStart, trimmed),
      $listId: listId,
      $name: trimmed,
      $checked: isChecked ? 1 : 0,
      $now: now.toISOString(),
      $onlyIfMissing: onlyIfMissing ? 1 : 0,
    }
  );
}

export async function softDeleteItem(db: Database, itemId: string, now: Date): Promise<void> {
  const timestamp = now.toISOString();
  await db.runAsync(
    'UPDATE shopping_list_items SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    timestamp,
    timestamp,
    itemId
  );
}

/** Creates the week's list row on first use. */
async function ensureList(db: Database, weekStart: DateKey, now: Date): Promise<string> {
  const id = await shoppingListId(weekStart);
  const timestamp = now.toISOString();
  await db.runAsync(
    `INSERT INTO shopping_lists (id, name, start_date, end_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO NOTHING`,
    id,
    `Week of ${formatDayMonth(fromDateKey(weekStart))}`,
    weekStart,
    toDateKey(addDays(fromDateKey(weekStart), 6)),
    timestamp,
    timestamp
  );
  return id;
}
