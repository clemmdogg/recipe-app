import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { imageUrl } from '@/api/mealdb';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RecipeSummary } from '@/types/recipe';

type RecipeRowProps = {
  recipe: RecipeSummary;
  /** Shown at the end of the row, e.g. a remove or add button. */
  trailing?: ReactNode;
};

/** Compact recipe line: thumbnail, name and category. */
export function RecipeRow({ recipe, trailing }: RecipeRowProps) {
  const theme = useTheme();
  const details = [recipe.category, recipe.area].filter(Boolean).join(' · ');

  return (
    <View style={styles.row}>
      <Image
        source={imageUrl(recipe.thumbnailUrl, 'small')}
        recyclingKey={recipe.id}
        contentFit="cover"
        style={[styles.image, { backgroundColor: theme.backgroundSelected }]}
      />
      <View style={styles.text}>
        <ThemedText numberOfLines={2}>{recipe.name}</ThemedText>
        {details !== '' && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {details}
          </ThemedText>
        )}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: Spacing.two,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
