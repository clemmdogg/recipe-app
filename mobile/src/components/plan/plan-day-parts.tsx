import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { RecipeRow } from '@/components/plan/recipe-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MealPlanEntry } from '@/types/meal-plan';
import { isHovered } from '@/utils/pressable';

/*
 * The pieces of a plan day, shared by the phone's day card (PlanDayCard) and the wide screen's
 * day row (PlanDayRow), so both look and behave the same.
 */

export function TodayBadge() {
  const theme = useTheme();
  return (
    <View style={[styles.todayBadge, { backgroundColor: theme.accent }]}>
      <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
        Today
      </ThemedText>
    </View>
  );
}

/** "+ Add": opens the screen for picking a dinner for the day. */
export function AddDinnerButton({ dayLabel, onPress }: { dayLabel: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Add dinner on ${dayLabel}`}
      style={(state) => [
        styles.addButton,
        { backgroundColor: isHovered(state) ? theme.backgroundSelected : theme.background },
        state.pressed && styles.pressed,
      ]}>
      <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={18} tintColor={theme.text} />
      <ThemedText type="smallBold">Add</ThemedText>
    </Pressable>
  );
}

type PlannedDinnerProps = {
  entry: MealPlanEntry;
  dayLabel: string;
  onRemove: (entryId: string) => void;
};

/** A planned dinner: tap it to open the recipe, or remove it from the day. */
export function PlannedDinner({ entry, dayLabel, onRemove }: PlannedDinnerProps) {
  const theme = useTheme();
  return (
    <View style={styles.entry}>
      <Pressable
        onPress={() => router.push({ pathname: '/plan/recipe/[id]', params: { id: entry.recipe.id } })}
        accessibilityRole="link"
        accessibilityLabel={entry.recipe.name}
        style={(state) => [styles.entryLink, isHovered(state) && styles.hovered, state.pressed && styles.pressed]}>
        <RecipeRow recipe={entry.recipe} />
      </Pressable>
      <Pressable
        onPress={() => onRemove(entry.id)}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${entry.recipe.name} from ${dayLabel}`}
        style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
        <SymbolView
          name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
          size={24}
          tintColor={theme.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
  hovered: {
    opacity: 0.85,
  },
  pressed: {
    opacity: 0.6,
  },
});
