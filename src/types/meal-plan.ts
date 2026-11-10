import type { RecipeSummary } from '@/types/recipe';
import type { DateKey } from '@/utils/dates';

export type MealPlanEntry = {
  id: string;
  date: DateKey;
  recipe: RecipeSummary;
};
