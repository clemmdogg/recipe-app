import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { CategoryChips } from '@/components/recipes/category-chips';
import { RecipeGrid } from '@/components/recipes/recipe-grid';
import { SearchField } from '@/components/search-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useRecipeBrowser, type BrowseMode } from '@/hooks/use-recipe-browser';

export default function RecipesScreen() {
  const browser = useRecipeBrowser();
  const { mode, recipes } = browser;

  const header = (
    <View style={styles.header}>
      <SearchField
        value={browser.query}
        onChangeText={browser.setQuery}
        placeholder="Search recipes, e.g. chicken"
        accessibilityLabel="Search recipes"
      />
      {mode.kind !== 'search' && browser.categories.length > 0 && (
        <CategoryChips
          categories={browser.categories}
          selected={browser.selectedCategory}
          onSelect={browser.setCategory}
        />
      )}
      <ThemedText type="heading" accessibilityRole="header">
        {sectionTitle(mode)}
      </ThemedText>
    </View>
  );

  let empty = <EmptyResults mode={mode} />;
  if (recipes.status === 'loading') {
    empty = <LoadingState message={mode.kind === 'search' ? 'Searching…' : 'Loading recipes…'} />;
  } else if (recipes.status === 'error') {
    empty = (
      <ErrorState
        message={recipes.error?.message ?? 'Something went wrong.'}
        onRetry={recipes.reload}
      />
    );
  }

  return (
    <RecipeGrid
      recipes={recipes.data ?? []}
      savedIds={browser.savedIds}
      header={header}
      empty={empty}
    />
  );
}

function sectionTitle(mode: BrowseMode): string {
  switch (mode.kind) {
    case 'search':
      return `Results for “${mode.query}”`;
    case 'category':
      return `${mode.category} recipes`;
    case 'saved':
      return 'Saved recipes';
  }
}

function EmptyResults({ mode }: { mode: BrowseMode }) {
  switch (mode.kind) {
    case 'search':
      return (
        <EmptyState
          icon={{ sf: 'magnifyingglass', md: 'search' }}
          title="No recipes found"
          message="Try another word, like chicken or pasta."
        />
      );
    case 'category':
      return (
        <EmptyState
          icon={{ sf: 'fork.knife', md: 'restaurant' }}
          title="No recipes in this category"
          message="Try another category."
        />
      );
    case 'saved':
      return (
        <EmptyState
          icon={{ sf: 'heart', md: 'favorite' }}
          title="No saved recipes yet"
          message="Search above or pick a category, then tap “Save recipe” on the ones you like."
        />
      );
  }
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.three,
  },
});
