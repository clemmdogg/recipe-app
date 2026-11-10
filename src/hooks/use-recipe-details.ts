import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { getRecipe } from '@/api/mealdb';
import { getPlannedDates } from '@/db/meal-plan';
import { getSavedRecipe, removeRecipe, saveRecipe } from '@/db/recipes';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useReloadOnRefocus } from '@/hooks/use-reload-on-refocus';
import type { Recipe } from '@/types/recipe';
import { toDateKey, type DateKey } from '@/utils/dates';

type LoadedRecipe = {
  recipe: Recipe | null;
  savedInDatabase: boolean;
  /** Upcoming days this recipe is planned for. */
  plannedDates: DateKey[];
};

/**
 * Loads a recipe from the saved copy if there is one (works offline), otherwise from TheMealDB,
 * and lets the user save or remove it.
 */
export function useRecipeDetails(id: string) {
  const db = useSQLiteContext();
  const resource = useAsyncResource<LoadedRecipe>(`recipe:${id}`, async (signal) => {
    const plannedDates = await getPlannedDates(db, id, toDateKey(new Date()));
    const saved = await getSavedRecipe(db, id);
    if (saved) {
      return { recipe: saved, savedInDatabase: true, plannedDates };
    }
    return { recipe: await getRecipe(id, signal), savedInDatabase: false, plannedDates };
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // "Add to plan" may save the recipe and adds planned dates, so refresh when coming back.
  const { reload } = resource;
  useReloadOnRefocus(reload);

  const recipe = resource.data?.recipe ?? null;
  const isSaved = resource.data?.savedInDatabase ?? false;

  /** Saves or removes the recipe. Rejects if the database write fails. */
  async function toggleSaved(): Promise<void> {
    if (!recipe || isUpdating) {
      return;
    }
    setIsUpdating(true);
    try {
      if (isSaved) {
        await removeRecipe(db, recipe.id);
      } else {
        await saveRecipe(db, recipe);
      }
      reload();
    } finally {
      setIsUpdating(false);
    }
  }

  return {
    status: resource.status,
    error: resource.error,
    reload,
    recipe,
    isSaved,
    plannedDates: resource.data?.plannedDates ?? [],
    isUpdating,
    toggleSaved,
  };
}
