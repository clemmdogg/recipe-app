import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { SaveRecipeButton } from '@/components/recipes/save-recipe-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeDay, fromDateKey, type DateKey } from '@/utils/dates';

type RecipeActionsProps = {
  isSaved: boolean;
  isUpdating: boolean;
  plannedDates: DateKey[];
  onToggleSaved: () => void;
  onAddToPlan: () => void;
};

/** Save and "Add to plan" buttons, plus the days this recipe is already planned for. */
export function RecipeActions({
  isSaved,
  isUpdating,
  plannedDates,
  onToggleSaved,
  onAddToPlan,
}: RecipeActionsProps) {
  const theme = useTheme();
  const today = new Date();
  const planned = plannedDates.map((key) => formatRelativeDay(fromDateKey(key), today)).join(', ');

  return (
    <View style={styles.container}>
      <View style={styles.buttons}>
        <SaveRecipeButton isSaved={isSaved} disabled={isUpdating} onPress={onToggleSaved} />
        <Pressable
          onPress={onAddToPlan}
          accessibilityRole="button"
          accessibilityLabel="Add to plan"
          style={({ pressed }) => [
            styles.planButton,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{ ios: 'calendar.badge.plus', android: 'calendar_add_on', web: 'calendar_add_on' }}
            size={22}
            tintColor={theme.text}
          />
          <ThemedText style={styles.planLabel}>Add to plan</ThemedText>
        </Pressable>
      </View>
      {planned !== '' && (
        <ThemedText type="small" themeColor="textSecondary">
          On your plan: {planned}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 52,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
  },
  planLabel: {
    fontSize: 17,
    fontWeight: 600,
  },
  pressed: {
    opacity: 0.7,
  },
});
