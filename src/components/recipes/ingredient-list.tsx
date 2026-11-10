import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Ingredient } from '@/types/recipe';

export function IngredientList({ ingredients }: { ingredients: Ingredient[] }) {
  const theme = useTheme();

  return (
    <View style={styles.list}>
      {ingredients.map((ingredient, index) => (
        <View
          key={`${index}-${ingredient.name}`}
          accessible
          accessibilityLabel={[ingredient.measure, ingredient.name].filter(Boolean).join(' ')}
          style={[
            styles.row,
            index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.backgroundSelected },
          ]}>
          <ThemedText style={styles.name}>{ingredient.name}</ThemedText>
          {ingredient.measure !== '' && (
            <ThemedText themeColor="textSecondary" style={styles.measure}>
              {ingredient.measure}
            </ThemedText>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  name: {
    flexShrink: 1,
    textTransform: 'capitalize',
  },
  measure: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
