import { useState } from 'react';

import { useDatabase } from '@/db/use-database';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { getPlan, planRecipe } from '@/repositories/meal-plan';
import { addDays, toDateKey } from '@/utils/dates';
import { useRecipeDetails } from '@/view-models/use-recipe-details';

const DaysAhead = 14;

/** The next two weeks with how many dinners each day has, and planning a recipe on one of them. */
export function useAddToPlan(recipeId: string) {
  const db = useDatabase();
  const details = useRecipeDetails(recipeId);
  const [isAdding, setIsAdding] = useState(false);

  const today = new Date();
  const days = Array.from({ length: DaysAhead }, (_, index) => addDays(today, index));
  const startKey = toDateKey(days[0]);
  const endKey = toDateKey(days[days.length - 1]);
  const plan = useAsyncResource(`plan:${startKey}:${endKey}`, () => getPlan(db, startKey, endKey));

  function dinnerCount(date: Date): number {
    const key = toDateKey(date);
    return (plan.data ?? []).filter((entry) => entry.date === key).length;
  }

  /**
   * Plans the recipe on `date`, saving it first if needed. Returns false if there is nothing
   * to add yet or it's already busy adding, and throws if saving fails.
   */
  async function add(date: Date): Promise<boolean> {
    if (!details.recipe || isAdding) {
      return false;
    }
    setIsAdding(true);
    try {
      await planRecipe(db, details.recipe, toDateKey(date));
      return true;
    } catch (error) {
      setIsAdding(false);
      throw error;
    }
  }

  return { ...details, today, days, dinnerCount, isAdding, add };
}
