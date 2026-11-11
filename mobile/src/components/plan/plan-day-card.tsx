import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { RecipeRow } from '@/components/plan/recipe-row';
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

/** One day of the plan: one dinner per row (picture left, name right), and an add button. */
export function PlanDayCard({ day, onAdd, onRemove }: PlanDayCardProps) {
  const theme = useTheme();
  const weekday = formatWeekday(day.date);
  const dayMonth = formatDayMonth(day.date);

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
          accessibilityLabel={`${day.isToday ? 'Today, ' : ''}${weekday} ${dayMonth}`}>
          <ThemedText type="heading">{weekday}</ThemedText>
          <ThemedText themeColor="textSecondary">{dayMonth}</ThemedText>
          {day.isToday && (
            <View style={[styles.todayBadge, { backgroundColor: theme.text }]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                Today
              </ThemedText>
            </View>
          )}
        </View>
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={`Add dinner on ${weekday} ${dayMonth}`}
          style={({ pressed }) => [styles.addButton, { backgroundColor: theme.background }, pressed && styles.pressed]}>
          <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={18} tintColor={theme.text} />
          <ThemedText type="smallBold">Add</ThemedText>
        </Pressable>
      </View>

      {day.entries.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Nothing planned
        </ThemedText>
      )}
      {day.entries.map((entry) => (
        <View key={entry.id} style={styles.entry}>
          <Pressable
            onPress={() => router.push({ pathname: '/plan/recipe/[id]', params: { id: entry.recipe.id } })}
            accessibilityRole="link"
            accessibilityLabel={entry.recipe.name}
            style={({ pressed }) => [styles.entryLink, pressed && styles.pressed]}>
            <RecipeRow recipe={entry.recipe} />
          </Pressable>
          <Pressable
            onPress={() => onRemove(entry.id)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${entry.recipe.name} from ${weekday} ${dayMonth}`}
            style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
              size={24}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        </View>
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
  todayBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  entryLink: {
    flex: 1,
  },
  removeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
