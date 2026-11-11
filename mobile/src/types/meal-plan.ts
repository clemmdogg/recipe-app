import type { RecipeSummary } from '@/types/recipe';
import type { DateKey } from '@/utils/dates';

export type MealPlanEntry = {
  id: string;
  date: DateKey;
  recipe: RecipeSummary;
};

/** One day of the weekly plan, with its dinners. */
export type PlanDay = {
  date: Date;
  key: DateKey;
  isToday: boolean;
  entries: MealPlanEntry[];
};
