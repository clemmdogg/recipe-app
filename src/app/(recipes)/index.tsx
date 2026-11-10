import { EmptyState } from '@/components/empty-state';

export default function RecipesScreen() {
  return (
    <EmptyState
      icon={{ sf: 'book', md: 'menu_book' }}
      title="No saved recipes yet"
      message="Search for recipes and save your favorites here."
    />
  );
}
