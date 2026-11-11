import { useState } from 'react';

import { addDays, startOfWeek, toDateKey } from '@/utils/dates';

/** Which week a screen shows (Monday to Sunday), starting with the current week. */
export function useWeekNavigation() {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));

  return {
    today,
    weekStart,
    startKey: toDateKey(weekStart),
    endKey: toDateKey(addDays(weekStart, 6)),
    showPreviousWeek: () => setWeekStart((start) => addDays(start, -7)),
    showNextWeek: () => setWeekStart((start) => addDays(start, 7)),
    showCurrentWeek: () => setWeekStart(startOfWeek(new Date())),
  };
}
