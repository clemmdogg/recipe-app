import { StyleSheet, View } from 'react-native';

import { AddDinnerButton, PlannedDinner, TodayBadge } from '@/components/plan/plan-day-parts';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PlanDay } from '@/types/meal-plan';
import { formatDayMonth, formatWeekday } from '@/utils/dates';

type PlanDayCardProps = {
  day: PlanDay;
  onAdd: () => void;
  onRemove: (entryId: string) => void;
};

/**
 * One day of the plan on a narrow screen: one dinner per row (picture left, name right), and an
 * add button. Wide screens use PlanDayRow instead.
 */
export function PlanDayCard({ day, onAdd, onRemove }: PlanDayCardProps) {
  const theme = useTheme();
  const weekday = formatWeekday(day.date);
  const dayMonth = formatDayMonth(day.date);
  const dayLabel = `${weekday} ${dayMonth}`;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: day.isToday ? theme.text : 'transparent' },
      ]}>
      <View style={styles.header}>
        <View
          style={styles.title}
          accessible
          accessibilityRole="header"
          accessibilityLabel={`${day.isToday ? 'Today, ' : ''}${dayLabel}`}>
          <ThemedText type="heading">{weekday}</ThemedText>
          <ThemedText themeColor="textSecondary">{dayMonth}</ThemedText>
          {day.isToday && <TodayBadge />}
        </View>
        <AddDinnerButton dayLabel={dayLabel} onPress={onAdd} />
      </View>

      {day.entries.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Nothing planned
        </ThemedText>
      )}
      {day.entries.map((entry) => (
        <PlannedDinner key={entry.id} entry={entry} dayLabel={dayLabel} onRemove={onRemove} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.two,
  },
});
