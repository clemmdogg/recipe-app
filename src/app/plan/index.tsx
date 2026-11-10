import { EmptyState } from '@/components/empty-state';

export default function PlanScreen() {
  return (
    <EmptyState
      icon={{ sf: 'calendar', md: 'calendar_month' }}
      title="No dinners planned"
      message="Add saved recipes to plan this week's dinners."
    />
  );
}
