import { addToPantry } from '@/db/pantry';
import { shoppingItemId, shoppingListId, softDeleteItem, upsertItem } from '@/db/shopping-list-rows';
import type { Database } from '@/db/types';
import type { DateKey } from '@/utils/dates';
import type { PlannedIngredient, StoredShoppingItem } from '@/utils/shopping-list';

/*
 * A week's shopping list is derived from the meal plan and the pantry (see buildShoppingList).
 * Only what the user does is stored: ticked-off lines and lines added by hand.
 */

/** Ingredients of the dinners planned from `startDate` to `endDate`, in plan order. */
export async function getPlannedIngredients(
  db: Database,
  startDate: DateKey,
  endDate: DateKey
): Promise<PlannedIngredient[]> {
  return db.getAllAsync<PlannedIngredient>(
    `SELECT e.date AS date, r.name AS recipeName, i.ingredient_name AS name, i.measure AS measure
     FROM meal_plan_entries e
     JOIN recipes r ON r.id = e.recipe_id
     JOIN recipe_ingredients i ON i.recipe_id = e.recipe_id AND i.deleted_at IS NULL
     WHERE e.deleted_at IS NULL AND e.date BETWEEN ? AND ?
     ORDER BY e.date, e.created_at, e.id, i.position`,
    startDate,
    endDate
  );
}

/** Lines the user ticked off or added for the week starting `weekStart`. */
export async function getStoredShoppingItems(
  db: Database,
  weekStart: DateKey
): Promise<StoredShoppingItem[]> {
  const rows = await db.getAllAsync<{ name: string; is_checked: number }>(
    `SELECT ingredient_name AS name, is_checked FROM shopping_list_items
     WHERE shopping_list_id = ? AND deleted_at IS NULL`,
    await shoppingListId(weekStart)
  );
  return rows.map((row) => ({ name: row.name, isChecked: row.is_checked === 1 }));
}

/** Ticks off an ingredient: it goes in the cart. The pantry is only updated by "Bought". */
export async function checkShoppingItem(
  db: Database,
  weekStart: DateKey,
  name: string,
  now = new Date()
): Promise<void> {
  await upsertItem(db, weekStart, name, true, now);
}

/**
 * Unticks an ingredient. A line needed by a planned dinner is removed (the plan brings it back
 * as "to buy"); a line added by hand stays on the list, unticked.
 */
export async function uncheckShoppingItem(
  db: Database,
  weekStart: DateKey,
  name: string,
  { isPlanned }: { isPlanned: boolean },
  now = new Date()
): Promise<void> {
  if (isPlanned) {
    await softDeleteItem(db, await shoppingItemId(weekStart, name), now);
  } else {
    await upsertItem(db, weekStart, name, false, now);
  }
}

/**
 * "Bought": puts everything in the week's cart into the pantry and empties the cart, in one
 * transaction. Planned ingredients then show as "Already at home"; items added by hand disappear.
 * Each line is updated on its own row, so it merges with other family members' changes.
 */
export async function markCartBought(db: Database, weekStart: DateKey, now = new Date()): Promise<void> {
  const listId = await shoppingListId(weekStart);
  await db.withTransactionAsync(async () => {
    const inCart = await db.getAllAsync<{ id: string; name: string }>(
      `SELECT id, ingredient_name AS name FROM shopping_list_items
       WHERE shopping_list_id = ? AND is_checked = 1 AND deleted_at IS NULL`,
      listId
    );
    for (const item of inCart) {
      await addToPantry(db, item.name, now);
      await softDeleteItem(db, item.id, now);
    }
  });
}

/** Adds a line by hand, e.g. something no dinner needs, or more of a pantry ingredient. */
export async function addShoppingItem(
  db: Database,
  weekStart: DateKey,
  name: string,
  now = new Date()
): Promise<void> {
  await upsertItem(db, weekStart, name, false, now, { onlyIfMissing: true });
}

/** Removes a line added by hand. */
export async function removeShoppingItem(
  db: Database,
  weekStart: DateKey,
  name: string,
  now = new Date()
): Promise<void> {
  await softDeleteItem(db, await shoppingItemId(weekStart, name), now);
}
