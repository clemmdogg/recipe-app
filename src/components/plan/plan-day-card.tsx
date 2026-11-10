import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { RecipeRow } from '@/components/plan/recipe-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { PlanDay } from '@/hooks/use-week-plan';
import { useTheme } from '@/hooks/use-theme';
import { formatDayMonth, formatWeekday } from '@/utils/dates';

type PlanDayCardProps = {
  day: PlanDay;
  onAdd: () => void;
  onRemove: (entryId: string) => void;
};

/** One day of the plan: its dinners and an "Add dinner" button. */
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
      <View style={styles.header} accessible accessibilityRole="header" accessibilityLabel={`${day.isToday ? 'Today, ' : ''}${weekday} ${dayMonth}`}>
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

      {day.entries.map((entry) => (
        <View key={entry.id} style={styles.entry}>
          <Link href={{ pathname: '/plan/recipe/[id]', params: { id: entry.recipe.id } }} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={entry.recipe.name}
              style={({ pressed }) => [styles.entryLink, pressed && styles.pressed]}>
              <RecipeRow recipe={entry.recipe} />
            </Pressable>
          </Link>
          <Pressable
            onPress={() => onRemove(entry.id)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${entry.recipe.name} from ${weekday}`}
            style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
              size={24}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        </View>
      ))}

      <Pressable
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel={`Add dinner on ${weekday} ${dayMonth}`}
        style={({ pressed }) => [styles.addButton, { backgroundColor: theme.background }, pressed && styles.pressed]}>
        <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={20} tintColor={theme.text} />
        <ThemedText type="smallBold">Add dinner</ThemedText>
      </Pressable>
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
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.two,
  },
  todayBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 48,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
});
