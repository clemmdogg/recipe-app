import { StyleSheet, View } from 'react-native';

import { AddDinnerButton, PlannedDinner, TodayBadge } from '@/components/plan/plan-day-parts';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PlanDay } from '@/types/meal-plan';
import { formatDayMonth, formatWeekday } from '@/utils/dates';

type PlanDayRowProps = {
  day: PlanDay;
  onAdd: () => void;
  onRemove: (entryId: string) => void;
};

/** Each planned dinner gets at least this much room, so its name isn't cut off. */
const DinnerMinWidth = 280;

/**
 * One day of the plan on a wide screen, as a row across the page: the day on the left, its
 * dinners side by side in the middle, and the add button on the right. Days without dinners
 * stay short, so the week reads like an agenda without gaps.
 */
export function PlanDayRow({ day, onAdd, onRemove }: PlanDayRowProps) {
  const theme = useTheme();
  const weekday = formatWeekday(day.date);
  const dayMonth = formatDayMonth(day.date);
  const dayLabel = `${weekday} ${dayMonth}`;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: theme.backgroundElement, borderColor: day.isToday ? theme.text : 'transparent' },
      ]}>
      <View
        style={styles.day}
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${day.isToday ? 'Today, ' : ''}${dayLabel}`}>
        <ThemedText type="heading">{weekday}</ThemedText>
        <ThemedText themeColor="textSecondary">{dayMonth}</ThemedText>
        {day.isToday && <TodayBadge />}
      </View>

      <View style={styles.dinners}>
        {day.entries.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.nothing}>
            Nothing planned
          </ThemedText>
        ) : (
          day.entries.map((entry) => (
            <View key={entry.id} style={[styles.dinner, { backgroundColor: theme.background }]}>
              <PlannedDinner entry={entry} dayLabel={dayLabel} onRemove={onRemove} />
            </View>
          ))
        )}
      </View>

      <AddDinnerButton dayLabel={dayLabel} onPress={onAdd} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    minHeight: 72,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: 2,
  },
  day: {
    width: 120,
    alignItems: 'flex-start',
    gap: Spacing.half,
  },
  dinners: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  dinner: {
    flexBasis: DinnerMinWidth,
    flexGrow: 0,
    flexShrink: 1,
    paddingLeft: Spacing.two,
    borderRadius: Spacing.three,
  },
  nothing: {
    paddingVertical: Spacing.two,
  },
});
