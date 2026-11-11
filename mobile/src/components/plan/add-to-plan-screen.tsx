import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeDay, toDateKey } from '@/utils/dates';
import { useAddToPlan } from '@/view-models/use-add-to-plan';

/** Modal for choosing which day to cook a recipe. Saves the recipe if it isn't saved yet. */
export function AddToPlanScreen({ id }: { id: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { recipe, status, error, reload, today, days, dinnerCount, isAdding, add } = useAddToPlan(id);

  const onPickDay = async (date: Date) => {
    try {
      if (await add(date)) {
        router.back();
      }
    } catch {
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
        const count = dinnerCount(date);
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
