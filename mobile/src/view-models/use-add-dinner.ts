import { useState } from 'react';

import { useDatabase } from '@/db/use-database';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { addToPlan } from '@/repositories/meal-plan';
import { getSavedRecipes } from '@/repositories/recipes';
import type { DateKey } from '@/utils/dates';

/** Saved recipes filtered by a search text, and adding one of them to the plan on `date`. */
export function useAddDinner(date: DateKey) {
  const db = useDatabase();
  const saved = useAsyncResource('saved', () => getSavedRecipes(db));
  const [filter, setFilter] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const needle = filter.trim().toLowerCase();
  const recipes = (saved.data ?? []).filter((recipe) => recipe.name.toLowerCase().includes(needle));

  /** Plans the recipe. Returns false if it's already busy adding, and throws if saving fails. */
  async function add(recipeId: string): Promise<boolean> {
    if (isAdding) {
      return false;
    }
    setIsAdding(true);
    try {
      await addToPlan(db, recipeId, date);
      return true;
    } catch (error) {
      setIsAdding(false);
      throw error;
    }
  }

  return {
    saved,
    filter,
    setFilter,
    isFiltering: needle !== '',
    hasSavedRecipes: (saved.data ?? []).length > 0,
    recipes,
    isAdding,
    add,
  };
}
