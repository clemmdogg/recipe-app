import { Stack } from 'expo-router';

import { CloseButton } from '@/components/close-button';

const modalOptions = {
  presentation: 'modal',
  headerBackVisible: false,
  headerRight: () => <CloseButton />,
} as const;

export default function PlanLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Plan', headerLargeTitle: true }} />
      <Stack.Screen name="recipe/[id]" options={{ title: '', headerBackTitle: 'Plan' }} />
      <Stack.Screen name="add-dinner" options={{ ...modalOptions, title: 'Add dinner' }} />
      <Stack.Screen name="add-to-plan" options={{ ...modalOptions, title: 'Add to plan' }} />
    </Stack>
  );
}
