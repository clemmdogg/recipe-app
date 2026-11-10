import { EmptyState } from '@/components/empty-state';

export default function ShoppingListScreen() {
  return (
    <EmptyState
      icon={{ sf: 'checklist', md: 'checklist' }}
      title="Your shopping list is empty"
      message="Generate a list from your dinner plan."
    />
  );
}
