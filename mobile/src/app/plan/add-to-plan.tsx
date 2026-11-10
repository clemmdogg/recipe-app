import { useLocalSearchParams } from 'expo-router';

import { AddToPlanScreen } from '@/components/plan/add-to-plan-screen';

export default function AddToPlanRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AddToPlanScreen id={id} />;
}
