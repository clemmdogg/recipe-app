import { useLocalSearchParams } from 'expo-router';

import { AddDinnerScreen } from '@/components/plan/add-dinner-screen';

export default function AddDinnerRoute() {
  const { date } = useLocalSearchParams<{ date: string }>();
  return <AddDinnerScreen date={date} />;
}
