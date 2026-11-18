import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { HeartIcon } from '@/components/recipes/heart-icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { imageUrl } from '@/services/mealdb';
import type { RecipeSummary } from '@/types/recipe';
import { isHovered } from '@/utils/pressable';

type RecipeCardProps = {
  recipe: RecipeSummary;
  width: number;
  isSaved: boolean;
};

export function RecipeCard({ recipe, width, isSaved }: RecipeCardProps) {
  const theme = useTheme();
  const details = [recipe.category, recipe.area].filter(Boolean).join(' · ');
  const label = [recipe.name, details, isSaved && 'saved'].filter(Boolean).join(', ');

  // Navigates in onPress rather than with <Link asChild>: Link drops a child's style function,
  // which would lose the card's width.
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={(state) => [
        styles.card,
        { width },
        isHovered(state) && styles.hovered,
        state.pressed && styles.pressed,
      ]}>
      <View>
        <Image
          source={imageUrl(recipe.thumbnailUrl, 'medium')}
          recyclingKey={recipe.id}
          contentFit="cover"
          transition={150}
          style={[styles.image, { backgroundColor: theme.backgroundElement }]}
        />
        {isSaved && (
          <View style={[styles.savedBadge, { backgroundColor: theme.background }]}>
            <HeartIcon filled size={20} />
          </View>
        )}
      </View>
      <View style={styles.text}>
        <ThemedText numberOfLines={2}>{recipe.name}</ThemedText>
        {details !== '' && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {details}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Spacing.three,
  },
  savedBadge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    gap: Spacing.half,
  },
  hovered: {
    opacity: 0.85,
  },
  pressed: {
    opacity: 0.7,
  },
});
