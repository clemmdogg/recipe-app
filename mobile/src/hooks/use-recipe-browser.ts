import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { getCategories, getRecipesByCategory, searchRecipes } from '@/api/mealdb';
import { getSavedRecipes } from '@/db/recipes';
import { useAsyncResource, type AsyncResource } from '@/hooks/use-async-resource';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useReloadOnRefocus } from '@/hooks/use-reload-on-refocus';
import type { RecipeSummary } from '@/types/recipe';

const SearchDelayMs = 400;

/** What the Recipes tab shows: a search, a category, or (by default) the saved recipes. */
export type BrowseMode =
  | { kind: 'saved' }
  | { kind: 'category'; category: string }
  | { kind: 'search'; query: string };

export function useRecipeBrowser() {
  const db = useSQLiteContext();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, SearchDelayMs);

  const saved = useAsyncResource('saved', () => getSavedRecipes(db));
  const categories = useAsyncResource('categories', (signal) => getCategories(signal));
  const categoryRecipes = useAsyncResource(
    category === null ? null : `category:${category}`,
    (signal) => (category === null ? Promise.resolve([]) : getRecipesByCategory(category, signal))
  );
  const search = useAsyncResource(
    debouncedQuery === '' ? null : `search:${debouncedQuery}`,
    (signal) => searchRecipes(debouncedQuery, signal)
  );

  // Saving or removing happens on the detail screen, so refresh when returning to this tab.
  useReloadOnRefocus(saved.reload);

  let mode: BrowseMode = { kind: 'saved' };
  let recipes: AsyncResource<RecipeSummary[]> = saved;
  if (trimmedQuery !== '') {
    mode = { kind: 'search', query: trimmedQuery };
    // While the user is still typing, show "searching" instead of results for an older query.
    recipes = trimmedQuery === debouncedQuery ? search : { ...search, status: 'loading', data: undefined };
  } else if (category !== null) {
    mode = { kind: 'category', category };
    recipes = categoryRecipes;
  }

  return {
    mode,
    recipes,
    /** Ids of saved recipes, so search and category results can mark them. */
    savedIds: new Set((saved.data ?? []).map((recipe) => recipe.id)),
    categories: categories.data ?? [],
    query,
    selectedCategory: category,
    setQuery,
    setCategory,
  };
}
