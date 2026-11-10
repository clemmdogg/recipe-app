import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getPlan, planRecipe } from '@/db/meal-plan';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useRecipeDetails } from '@/hooks/use-recipe-details';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatRelativeDay, toDateKey } from '@/utils/dates';

const DaysAhead = 14;

/** Modal for choosing which day to cook a recipe. Saves the recipe if it isn't saved yet. */
export function AddToPlanScreen({ id }: { id: string }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { recipe, status, error, reload } = useRecipeDetails(id);
  const [isAdding, setIsAdding] = useState(false);

  const today = new Date();
  const days = Array.from({ length: DaysAhead }, (_, index) => addDays(today, index));
  const startKey = toDateKey(days[0]);
  const endKey = toDateKey(days[days.length - 1]);
  const plan = useAsyncResource(`plan:${startKey}:${endKey}`, () => getPlan(db, startKey, endKey));

  const onPickDay = async (date: Date) => {
    if (!recipe || isAdding) {
      return;
    }
    setIsAdding(true);
    try {
      await planRecipe(db, recipe, toDateKey(date));
      router.back();
    } catch {
      setIsAdding(false);
      Alert.alert('Could not add to your plan', 'Please try again.');
    }
  };

  if (!recipe) {
    return status === 'error' ? (
      <ErrorState message={error?.message ?? 'Something went wrong.'} onRetry={reload} />
    ) : (
      <LoadingState />
    );
  }

  return (
    <FlatList
      data={days}
      keyExtractor={(date) => toDateKey(date)}
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingBottom: Spacing.four + insets.bottom }]}
      ListHeaderComponent={
        <ThemedText themeColor="textSecondary" style={styles.intro}>
          Which day do you want to cook {recipe.name}?
        </ThemedText>
      }
      renderItem={({ item: date }) => {
        const key = toDateKey(date);
        const count = (plan.data ?? []).filter((entry) => entry.date === key).length;
        const label = formatRelativeDay(date, today);
        const detail = count === 0 ? 'Nothing planned' : `${count} dinner${count === 1 ? '' : 's'} planned`;
        return (
          <Pressable
            onPress={() => onPickDay(date)}
            disabled={isAdding}
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${detail}`}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: theme.backgroundElement },
              (pressed || isAdding) && styles.pressed,
            ]}>
            <View style={styles.rowText}>
              <ThemedText style={styles.dayLabel}>{label}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {detail}
              </ThemedText>
            </View>
            <SymbolView
              name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
              size={28}
              tintColor={theme.text}
            />
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.two,
    padding: Spacing.three,
  },
  intro: {
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 64,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  dayLabel: {
    fontSize: 17,
    fontWeight: 600,
  },
  pressed: {
    opacity: 0.6,
  },
});
