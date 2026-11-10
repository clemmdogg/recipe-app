import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { getPlan, removeFromPlan } from '@/db/meal-plan';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useReloadOnRefocus } from '@/hooks/use-reload-on-refocus';
import type { MealPlanEntry } from '@/types/meal-plan';
import { addDays, daysOfWeek, startOfWeek, toDateKey, type DateKey } from '@/utils/dates';

export type PlanDay = {
  date: Date;
  key: DateKey;
  isToday: boolean;
  entries: MealPlanEntry[];
};

/** The meal plan for one week at a time, starting with the current week. */
export function useWeekPlan() {
  const db = useSQLiteContext();
  const today = new Date();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));

  const startKey = toDateKey(weekStart);
  const endKey = toDateKey(addDays(weekStart, 6));
  const plan = useAsyncResource(`plan:${startKey}`, () => getPlan(db, startKey, endKey));

  // Dinners are added in the "Add dinner" screen and from recipes, so refresh on return.
  const { reload } = plan;
  useReloadOnRefocus(reload);

  const todayKey = toDateKey(today);
  const entries = plan.data ?? [];
  const days: PlanDay[] = daysOfWeek(weekStart).map((date) => {
    const key = toDateKey(date);
    return {
      date,
      key,
      isToday: key === todayKey,
      entries: entries.filter((entry) => entry.date === key),
    };
  });

  async function removeEntry(entryId: string): Promise<void> {
    await removeFromPlan(db, entryId);
    reload();
  }

  return {
    weekStart,
    today,
    days,
    status: plan.status,
    hasData: plan.data !== undefined,
    error: plan.error,
    reload,
    isCurrentWeek: startKey === toDateKey(startOfWeek(today)),
    showPreviousWeek: () => setWeekStart((start) => addDays(start, -7)),
    showNextWeek: () => setWeekStart((start) => addDays(start, 7)),
    showCurrentWeek: () => setWeekStart(startOfWeek(new Date())),
    removeEntry,
  };
}
