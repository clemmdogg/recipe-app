import { EmptyState } from '@/components/empty-state';

export default function PantryScreen() {
  return (
    <EmptyState
      icon={{ sf: 'refrigerator', md: 'kitchen' }}
      title="Your pantry is empty"
      message="Add the ingredients you have at home."
    />
  );
}
