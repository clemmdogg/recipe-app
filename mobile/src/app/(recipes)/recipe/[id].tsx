import { useLocalSearchParams } from 'expo-router';

import { RecipeScreen } from '@/components/recipes/recipe-screen';

export default function RecipesTabRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecipeScreen id={id} tab="recipes" />;
}
