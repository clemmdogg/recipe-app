import { useLocalSearchParams } from 'expo-router';

import { RecipeScreen } from '@/components/recipes/recipe-screen';

export default function PlanTabRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecipeScreen id={id} tab="plan" />;
}
