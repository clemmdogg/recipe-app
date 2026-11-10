import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { IngredientRow } from '@/components/pantry/ingredient-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { AsyncResource } from '@/hooks/use-async-resource';
import { useTheme } from '@/hooks/use-theme';
import type { CatalogIngredient } from '@/types/pantry';

type IngredientSuggestionsProps = {
  query: string;
  catalog: { status: string; reload: () => void };
  suggestions: AsyncResource<CatalogIngredient[]>;
  /** Whether an ingredient is already added, e.g. in the pantry or on the list. */
  isAdded: (name: string) => boolean;
  /** Shown instead of the add button for added ingredients, e.g. "In pantry". */
  addedLabel: string;
  /** Where ingredients are added to, for screen readers, e.g. "pantry". */
  targetName: string;
  onAdd: (name: string) => void;
};

/** Ingredients matching the search, each with an add button or an "already added" mark. */
export function IngredientSuggestions({
  query,
  catalog,
  suggestions,
  isAdded,
  addedLabel,
  targetName,
  onAdd,
}: IngredientSuggestionsProps) {
  const theme = useTheme();

  if (catalog.status === 'error') {
    return (
      <ErrorState
        message="Couldn't load the ingredient list. Check your internet connection."
        onRetry={catalog.reload}
      />
    );
  }
  if (catalog.status !== 'success' || suggestions.data === undefined) {
    return <LoadingState message="Finding ingredients…" />;
  }
  if (suggestions.data.length === 0) {
    return (
      <ThemedText themeColor="textSecondary" style={styles.noMatch}>
        No ingredient called “{query.trim()}”. Try another spelling.
      </ThemedText>
    );
  }

  return (
    <View style={[styles.list, { backgroundColor: theme.backgroundElement }]}>
      {suggestions.data.map((ingredient) => {
        const added = isAdded(ingredient.name);
        return (
          <Pressable
            key={ingredient.name}
            onPress={() => onAdd(ingredient.name)}
            disabled={added}
            accessibilityRole="button"
            accessibilityLabel={
              added
                ? `${ingredient.name}, already in ${targetName}`
                : `Add ${ingredient.name} to ${targetName}`
            }
            accessibilityState={{ disabled: added }}
            style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}>
            <IngredientRow
              name={ingredient.name}
              detail={ingredient.type}
              trailing={
                added ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {addedLabel}
                  </ThemedText>
                ) : (
                  <SymbolView
                    name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
                    size={28}
                    tintColor={theme.text}
                  />
                )
              }
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  suggestion: {
    paddingVertical: Spacing.one,
  },
  noMatch: {
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
});
