import {
  addDays,
  daysOfWeek,
  formatRelativeDay,
  formatShortDate,
  formatWeekRange,
  fromDateKey,
  startOfWeek,
  toDateKey,
} from '@/utils/dates';

const day = (key: string) => fromDateKey(key);
const keys = (dates: Date[]) => dates.map(toDateKey);

describe('test time zone', () => {
  it('runs in a zone with daylight saving time', () => {
    // 25 Oct 2026 is when Europe switches back from summer time.
    expect(new Date(2026, 9, 24).getTimezoneOffset()).not.toBe(new Date(2026, 9, 26).getTimezoneOffset());
  });
});

describe('date keys', () => {
  it('round-trips a local date', () => {
    expect(toDateKey(day('2026-11-10'))).toBe('2026-11-10');
  });

  it('uses the local calendar day, not UTC', () => {
    // 00:30 in Copenhagen is still the previous day in UTC.
    expect(toDateKey(new Date(2026, 10, 10, 0, 30))).toBe('2026-11-10');
  });

  it('rejects malformed keys', () => {
    expect(() => fromDateKey('10/11/2026')).toThrow(/Invalid date key/);
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(toDateKey(addDays(day('2026-12-30'), 3))).toBe('2027-01-02');
  });

  it('stays on the right day across the end of summer time', () => {
    // That day is 25 hours long; adding 24 hours would land on the same day.
    expect(toDateKey(addDays(day('2026-10-25'), 1))).toBe('2026-10-26');
  });

  it('stays on the right day across the start of summer time', () => {
    expect(toDateKey(addDays(day('2026-03-28'), 2))).toBe('2026-03-30');
  });
});

describe('startOfWeek', () => {
  it('returns the Monday of the week', () => {
    expect(toDateKey(startOfWeek(day('2026-11-12')))).toBe('2026-11-09');
  });

  it('keeps a Monday as is', () => {
    expect(toDateKey(startOfWeek(day('2026-11-09')))).toBe('2026-11-09');
  });

  it('treats Sunday as the last day of the week', () => {
    expect(toDateKey(startOfWeek(day('2026-11-15')))).toBe('2026-11-09');
  });

  it('works for a week that spans a new year', () => {
    expect(toDateKey(startOfWeek(day('2027-01-01')))).toBe('2026-12-28');
  });

  it('ignores the time of day', () => {
    expect(toDateKey(startOfWeek(new Date(2026, 10, 12, 23, 59)))).toBe('2026-11-09');
  });
});

describe('daysOfWeek', () => {
  it('returns Monday to Sunday', () => {
    expect(keys(daysOfWeek(day('2026-10-19')))).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
  });
});

describe('formatting', () => {
  const today = day('2026-11-10');

  it('formats a short date', () => {
    expect(formatShortDate(day('2026-11-10'))).toBe('Tue 10 Nov');
  });

  it('names today and tomorrow', () => {
    expect(formatRelativeDay(today, today)).toBe('Today');
    expect(formatRelativeDay(day('2026-11-11'), today)).toBe('Tomorrow');
    expect(formatRelativeDay(day('2026-11-12'), today)).toBe('Thu 12 Nov');
  });

  it('formats a week within one month', () => {
    expect(formatWeekRange(day('2026-11-09'), today)).toBe('9–15 Nov');
  });

  it('formats a week across two months', () => {
    expect(formatWeekRange(day('2026-10-26'), today)).toBe('26 Oct – 1 Nov');
  });

  it('adds the year when the week is not in the current year', () => {
    expect(formatWeekRange(day('2026-12-28'), today)).toBe('28 Dec – 3 Jan 2027');
  });
});
