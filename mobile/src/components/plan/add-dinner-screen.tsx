import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showMessage } from '@/components/dialogs';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { RecipeRow } from '@/components/plan/recipe-row';
import { PrimaryButton } from '@/components/primary-button';
import { SearchField } from '@/components/search-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeDay, fromDateKey, type DateKey } from '@/utils/dates';
import { useAddDinner } from '@/view-models/use-add-dinner';

/** Modal for choosing a saved recipe to cook on `date`. */
export function AddDinnerScreen({ date }: { date: DateKey }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { saved, filter, setFilter, isFiltering, hasSavedRecipes, recipes, isAdding, add } =
    useAddDinner(date);

  const dayLabel = formatRelativeDay(fromDateKey(date), new Date());

  const onPick = async (recipeId: string) => {
    try {
      if (await add(recipeId)) {
        router.back();
      }
    } catch {
      showMessage('Could not add to your plan', 'Please try again.');
    }
  };

  const findRecipes = () => {
    router.back();
    router.navigate('/');
  };

  let empty = <LoadingState />;
  if (saved.status === 'error') {
    empty = <ErrorState message="Could not load your saved recipes." onRetry={saved.reload} />;
  } else if (saved.status === 'success' && isFiltering) {
    empty = (
      <EmptyState
        icon={{ sf: 'magnifyingglass', md: 'search' }}
        title="No match"
        message={`None of your saved recipes match “${filter.trim()}”.`}
      />
    );
  } else if (saved.status === 'success') {
    empty = (
      <View style={styles.emptyNoSaved}>
        <EmptyState
          icon={{ sf: 'heart', md: 'favorite' }}
          title="No saved recipes yet"
          message="Save some recipes first, then plan them here."
        />
        <PrimaryButton label="Find recipes" onPress={findRecipes} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `Dinner for ${dayLabel}` }} />
      <FlatList
        data={recipes}
        keyExtractor={(recipe) => recipe.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[styles.content, { paddingBottom: Spacing.four + insets.bottom }]}
        ListHeaderComponent={
          hasSavedRecipes ? (
            <SearchField
              value={filter}
              onChangeText={setFilter}
              placeholder="Find a saved recipe"
              accessibilityLabel="Find a saved recipe"
            />
          ) : undefined
        }
        ListEmptyComponent={empty}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onPick(item.id)}
            disabled={isAdding}
            accessibilityRole="button"
            accessibilityLabel={`Add ${item.name} to ${dayLabel}`}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: theme.backgroundElement },
              (pressed || isAdding) && styles.pressed,
            ]}>
            <RecipeRow
              recipe={item}
              trailing={
                <SymbolView
                  name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
                  size={28}
                  tintColor={theme.text}
                />
              }
            />
          </Pressable>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.two,
    padding: Spacing.three,
  },
  row: {
    padding: Spacing.two,
    borderRadius: Spacing.three,
  },
  emptyNoSaved: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
});
