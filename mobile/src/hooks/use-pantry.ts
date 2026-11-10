import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { PantryStaples } from '@/constants/pantry';
import { searchIngredients } from '@/db/ingredients';
import { addToPantry, getPantryItems, removeFromPantry } from '@/db/pantry';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useIngredientCatalog } from '@/hooks/use-ingredient-catalog';
import { useReloadOnRefocus } from '@/hooks/use-reload-on-refocus';

/** Pantry items, ingredient suggestions while typing, and adding/removing items. */
export function usePantry() {
  const db = useSQLiteContext();
  const [query, setQuery] = useState('');
  const catalog = useIngredientCatalog();

  const items = useAsyncResource('pantry', () => getPantryItems(db));
  // The shopping list will move bought items into the pantry, so refresh when coming back.
  useReloadOnRefocus(items.reload);

  const trimmedQuery = query.trim();
  const suggestions = useAsyncResource(
    catalog.isReady && trimmedQuery !== '' ? `ingredients:${trimmedQuery}` : null,
    () => searchIngredients(db, trimmedQuery),
    { keepPreviousData: true }
  );

  const inPantry = new Set((items.data ?? []).map((item) => item.name.toLowerCase()));
  const isInPantry = (name: string) => inPantry.has(name.toLowerCase());

  /** Adds an ingredient and clears the search, ready for the next one. */
  async function add(name: string): Promise<void> {
    await addToPantry(db, name);
    setQuery('');
    items.reload();
  }

  async function remove(id: string): Promise<void> {
    await removeFromPantry(db, id);
    items.reload();
  }

  return {
    query,
    setQuery,
    items,
    catalog,
    suggestions,
    isInPantry,
    /** Common basics not in the pantry yet, for one-tap adding. */
    missingStaples: PantryStaples.filter((name) => !isInPantry(name)),
    add,
    remove,
  };
}
