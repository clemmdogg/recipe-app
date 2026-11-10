import { Stack } from 'expo-router';

export default function HouseholdLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Household', headerLargeTitle: true }} />
    </Stack>
  );
}
