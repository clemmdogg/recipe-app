import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ingredientImageUrl } from '@/api/mealdb';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IngredientRowProps = {
  name: string;
  detail?: string | null;
  /** Shown at the end of the row, e.g. a remove or add button. */
  trailing?: ReactNode;
};

/** An ingredient with its picture from TheMealDB. */
export function IngredientRow({ name, detail, trailing }: IngredientRowProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <Image
        source={ingredientImageUrl(name)}
        contentFit="contain"
        transition={100}
        accessibilityIgnoresInvertColors
        style={[styles.image, { backgroundColor: theme.background }]}
      />
      <View style={styles.text}>
        <ThemedText numberOfLines={2}>{name}</ThemedText>
        {detail && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {detail}
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
    minHeight: 56,
  },
  image: {
    width: 44,
    height: 44,
    borderRadius: Spacing.two,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
