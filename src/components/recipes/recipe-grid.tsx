import { useState, type ReactElement } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecipeCard } from '@/components/recipes/recipe-card';
import { Spacing } from '@/constants/theme';
import { getLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import type { RecipeSummary } from '@/types/recipe';

type RecipeGridProps = {
  recipes: RecipeSummary[];
  savedIds: ReadonlySet<string>;
  header?: ReactElement;
  empty?: ReactElement;
};

const Gap = Spacing.three;

export function RecipeGrid({ recipes, savedIds, header, empty }: RecipeGridProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  // Measure the list itself: on iPad the sidebar and split view make it narrower than the window.
  const [listWidth, setListWidth] = useState(window.width);

  const paddingLeft = Spacing.three + insets.left;
  const paddingRight = Spacing.three + insets.right;
  const { gridColumns } = getLayout(listWidth, window.height);
  const contentWidth = listWidth - paddingLeft - paddingRight;
  const cardWidth = Math.floor((contentWidth - Gap * (gridColumns - 1)) / gridColumns);

  const onLayout = (event: LayoutChangeEvent) => setListWidth(event.nativeEvent.layout.width);

  return (
    <FlatList
      // Changing numColumns requires a fresh list.
      key={gridColumns}
      data={recipes}
      keyExtractor={(recipe) => recipe.id}
      numColumns={gridColumns}
      renderItem={({ item }) => (
        <RecipeCard recipe={item} width={cardWidth} isSaved={savedIds.has(item.id)} />
      )}
      // Re-render cards when saved state changes, not only when the list does.
      extraData={savedIds}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      onLayout={onLayout}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: theme.background }}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[
        styles.content,
        { paddingLeft, paddingRight, paddingBottom: Spacing.four + insets.bottom },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
    paddingTop: Spacing.three,
  },
  row: {
    gap: Gap,
  },
});
