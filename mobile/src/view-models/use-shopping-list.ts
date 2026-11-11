import { useState } from 'react';

import { useDatabase } from '@/db/use-database';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useReloadOnRefocus } from '@/hooks/use-reload-on-refocus';
import { searchIngredients } from '@/repositories/ingredients';
import { getPantryItems } from '@/repositories/pantry';
import {
  addShoppingItem,
  checkShoppingItem,
  getPlannedIngredients,
  getStoredShoppingItems,
  markCartBought,
  removeShoppingItem,
  uncheckShoppingItem,
} from '@/repositories/shopping-list';
import type { ShoppingLine } from '@/types/shopping-list';
import { buildShoppingList, ingredientKey } from '@/utils/shopping-list';
import { useIngredientCatalog } from '@/view-models/use-ingredient-catalog';
import { useWeekNavigation } from '@/view-models/use-week-navigation';

/** The shopping list for one week at a time, derived from the plan and the pantry. */
export function useShoppingList() {
  const db = useDatabase();
  const week = useWeekNavigation();
  const { startKey, endKey } = week;
  const [query, setQuery] = useState('');
  const catalog = useIngredientCatalog();

  const list = useAsyncResource(`shopping:${startKey}`, async () => {
    const planned = await getPlannedIngredients(db, startKey, endKey);
    const stored = await getStoredShoppingItems(db, startKey);
    const pantry = await getPantryItems(db);
    return buildShoppingList(planned, stored, pantry.map((item) => item.name));
  });
  // The plan and the pantry change in other tabs, so rebuild the list when coming back.
  const { reload } = list;
  useReloadOnRefocus(reload);

  const trimmedQuery = query.trim();
  const suggestions = useAsyncResource(
    catalog.isReady && trimmedQuery !== '' ? `ingredients:${trimmedQuery}` : null,
    () => searchIngredients(db, trimmedQuery),
    { keepPreviousData: true }
  );

  const onList = new Set(
    [...(list.data?.toBuy ?? []), ...(list.data?.inCart ?? [])].map((line) => line.key)
  );

  /** Ticks a line off (it goes in the cart) or unticks it. */
  async function toggle(line: ShoppingLine, isChecked: boolean): Promise<void> {
    if (isChecked) {
      await uncheckShoppingItem(db, startKey, line.name, { isPlanned: line.isPlanned });
    } else {
      await checkShoppingItem(db, startKey, line.name);
    }
    reload();
  }

  /** Adds an item by hand, or puts a pantry ingredient back on the list ("need more"). */
  async function add(name: string): Promise<void> {
    await addShoppingItem(db, startKey, name);
    setQuery('');
    reload();
  }

  async function remove(line: ShoppingLine): Promise<void> {
    await removeShoppingItem(db, startKey, line.name);
    reload();
  }

  /** Moves everything in the cart into the pantry and empties the cart. */
  async function markBought(): Promise<void> {
    await markCartBought(db, startKey);
    reload();
  }

  return {
    week,
    list,
    query,
    setQuery,
    catalog,
    suggestions,
    isOnList: (name: string) => onList.has(ingredientKey(name)),
    toggle,
    add,
    remove,
    markBought,
  };
}
