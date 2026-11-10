import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { HeartIcon } from '@/components/recipes/heart-icon';
import { RecipeDetails } from '@/components/recipes/recipe-details';
import { useRecipeDetails } from '@/hooks/use-recipe-details';

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const details = useRecipeDetails(id);
  const { recipe } = details;

  const onToggleSaved = () => {
    details.toggleSaved().catch(() => {
      Alert.alert('Could not update your saved recipes', 'Please try again.');
    });
  };

  let content = <LoadingState message="Loading recipe…" />;
  if (recipe) {
    content = (
      <RecipeDetails
        recipe={recipe}
        isSaved={details.isSaved}
        isUpdating={details.isUpdating}
        onToggleSaved={onToggleSaved}
      />
    );
  } else if (details.status === 'error') {
    content = (
      <ErrorState message={details.error?.message ?? 'Something went wrong.'} onRetry={details.reload} />
    );
  } else if (details.status === 'success') {
    content = (
      <EmptyState
        icon={{ sf: 'questionmark.circle', md: 'help' }}
        title="Recipe not found"
        message="It may have been removed from TheMealDB."
      />
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: recipe
            ? () => (
                <HeaderHeartButton
                  isSaved={details.isSaved}
                  disabled={details.isUpdating}
                  onPress={onToggleSaved}
                />
              )
            : undefined,
        }}
      />
      {content}
    </>
  );
}

type HeaderHeartButtonProps = {
  isSaved: boolean;
  disabled: boolean;
  onPress: () => void;
};

/** Shortcut to save while scrolled down; the main button is under the recipe title. */
function HeaderHeartButton({ isSaved, disabled, onPress }: HeaderHeartButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isSaved ? 'Remove from saved recipes' : 'Save recipe'}
      accessibilityState={{ selected: isSaved, disabled }}
      style={({ pressed }) => [styles.headerButton, (pressed || disabled) && styles.pressed]}>
      <HeartIcon filled={isSaved} size={28} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.5,
  },
});
