import { Stack } from 'expo-router';

import { CloseButton } from '@/components/close-button';

export default function RecipesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Recipes', headerLargeTitle: true }} />
      <Stack.Screen name="recipe/[id]" options={{ title: '', headerBackTitle: 'Recipes' }} />
      <Stack.Screen
        name="add-to-plan"
        options={{
          presentation: 'modal',
          title: 'Add to plan',
          headerBackVisible: false,
          headerRight: () => <CloseButton />,
        }}
      />
    </Stack>
  );
}
