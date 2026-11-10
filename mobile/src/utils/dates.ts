/**
 * Calendar-date helpers for the meal plan. Dates are local calendar days, stored as
 * 'YYYY-MM-DD' "date keys". All arithmetic goes through the Date(year, month, day)
 * constructor, so it stays on midnight across daylight saving changes.
 * Weeks start on Monday.
 */

export type DateKey = string;

const Locale = 'en-GB';
const DateKeyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toDateKey(date: Date): DateKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromDateKey(key: DateKey): Date {
  const match = DateKeyPattern.exec(key);
  if (!match) {
    throw new Error(`Invalid date key: ${key}`);
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** The Monday on or before `date`, at local midnight. */
export function startOfWeek(date: Date): Date {
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return addDays(date, -daysSinceMonday);
}

/** The seven days of the week that starts on `weekStart`. */
export function daysOfWeek(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

/** "Mon" */
export function formatWeekday(date: Date): string {
  return date.toLocaleDateString(Locale, { weekday: 'short' });
}

/** "10 Nov" */
export function formatDayMonth(date: Date): string {
  return date.toLocaleDateString(Locale, { day: 'numeric', month: 'short' });
}

/** "Mon 10 Nov" */
export function formatShortDate(date: Date): string {
  return `${formatWeekday(date)} ${formatDayMonth(date)}`;
}

/** "Today", "Tomorrow", or "Wed 12 Nov". */
export function formatRelativeDay(date: Date, today: Date): string {
  const key = toDateKey(date);
  if (key === toDateKey(today)) {
    return 'Today';
  }
  if (key === toDateKey(addDays(today, 1))) {
    return 'Tomorrow';
  }
  return formatShortDate(date);
}

/** "10–16 Nov", "27 Oct – 2 Nov", or with the year when it isn't the current one. */
export function formatWeekRange(weekStart: Date, today: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const showYear = weekStart.getFullYear() !== today.getFullYear() || weekEnd.getFullYear() !== today.getFullYear();
  const year = showYear ? ` ${weekEnd.getFullYear()}` : '';
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    const month = weekEnd.toLocaleDateString(Locale, { month: 'short' });
    return `${weekStart.getDate()}–${weekEnd.getDate()} ${month}${year}`;
  }
  return `${formatDayMonth(weekStart)} – ${formatDayMonth(weekEnd)}${year}`;
}
