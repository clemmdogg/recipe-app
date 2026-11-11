import { Stack } from 'expo-router';

import { CloseButton } from '@/components/close-button';

const modalOptions = {
  presentation: 'modal',
  headerBackVisible: false,
  headerRight: () => <CloseButton />,
} as const;

export default function HouseholdLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Household', headerLargeTitle: true }} />
      <Stack.Screen name="rename" options={{ ...modalOptions, title: 'Rename household' }} />
      <Stack.Screen name="join" options={{ ...modalOptions, title: 'Join with code' }} />
      <Stack.Screen name="delete-account" options={{ ...modalOptions, title: 'Delete account' }} />
    </Stack>
  );
}
