import { EmptyState } from '@/components/empty-state';

// Placeholder until accounts and sync exist. See "Planned: login and household sync" in CLAUDE.md.
export default function HouseholdScreen() {
  return (
    <EmptyState
      icon={{ sf: 'person.3', md: 'group' }}
      title="Your household"
      message="Coming soon: invite your family so everyone shares recipes, the meal plan, the shopping list and the pantry."
    />
  );
}
