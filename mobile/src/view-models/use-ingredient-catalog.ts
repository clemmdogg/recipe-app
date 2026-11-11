import { useDatabase } from '@/db/use-database';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { getIngredientCatalogUpdatedAt, replaceIngredientCatalog } from '@/repositories/ingredients';
import { getIngredients } from '@/services/mealdb';

const MaxCatalogAgeMs = 30 * 24 * 60 * 60 * 1000;

/**
 * Makes sure the local copy of TheMealDB's ingredient list exists. Downloads it the first time
 * and refreshes it when it's older than 30 days. Offline, an existing copy is used as is.
 */
export function useIngredientCatalog() {
  const db = useDatabase();
  const catalog = useAsyncResource('ingredient-catalog', async (signal) => {
    const updatedAt = await getIngredientCatalogUpdatedAt(db);
    if (updatedAt && Date.now() - updatedAt.getTime() < MaxCatalogAgeMs) {
      return updatedAt;
    }
    try {
      await replaceIngredientCatalog(db, await getIngredients(signal));
      return new Date();
    } catch (error) {
      if (updatedAt && !signal.aborted) {
        return updatedAt;
      }
      throw error;
    }
  });

  return {
    isReady: catalog.status === 'success',
    status: catalog.status,
    error: catalog.error,
    reload: catalog.reload,
  };
}
