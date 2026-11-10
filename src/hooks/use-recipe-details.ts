import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { getRecipe } from '@/api/mealdb';
import { getSavedRecipe, removeRecipe, saveRecipe } from '@/db/recipes';
import { useAsyncResource } from '@/hooks/use-async-resource';
import type { Recipe } from '@/types/recipe';

type LoadedRecipe = {
  recipe: Recipe | null;
  savedInDatabase: boolean;
};

/**
 * Loads a recipe from the saved copy if there is one (works offline), otherwise from TheMealDB,
 * and lets the user save or remove it.
 */
export function useRecipeDetails(id: string) {
  const db = useSQLiteContext();
  const resource = useAsyncResource<LoadedRecipe>(`recipe:${id}`, async (signal) => {
    const saved = await getSavedRecipe(db, id);
    if (saved) {
      return { recipe: saved, savedInDatabase: true };
    }
    return { recipe: await getRecipe(id, signal), savedInDatabase: false };
  });

  // Reflects saves/removals made on this screen without reloading the recipe.
  const [savedOverride, setSavedOverride] = useState<{ id: string; saved: boolean } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const recipe = resource.data?.recipe ?? null;
  const isSaved =
    savedOverride?.id === id ? savedOverride.saved : (resource.data?.savedInDatabase ?? false);

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
      setSavedOverride({ id, saved: !isSaved });
    } finally {
      setIsUpdating(false);
    }
  }

  return {
    status: resource.status,
    error: resource.error,
    reload: resource.reload,
    recipe,
    isSaved,
    isUpdating,
    toggleSaved,
  };
}
