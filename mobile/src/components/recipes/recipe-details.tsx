import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinkButton } from '@/components/link-button';
import { IngredientList } from '@/components/recipes/ingredient-list';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { imageUrl } from '@/services/mealdb';
import type { Recipe } from '@/types/recipe';

type RecipeDetailsProps = {
  recipe: Recipe;
  /** Buttons shown under the title, e.g. save and add to plan. */
  actions: ReactNode;
};

/** Recipe content. Phones stack everything; wide layouts put instructions beside the ingredients. */
export function RecipeDetails({ recipe, actions }: RecipeDetailsProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isWide } = useLayout();
  const details = [recipe.category, recipe.area].filter(Boolean).join(' · ');

  const overview = (
    <View style={styles.section}>
      <Image
        source={imageUrl(recipe.thumbnailUrl, 'large')}
        contentFit="cover"
        transition={150}
        accessibilityIgnoresInvertColors
        style={[styles.image, { backgroundColor: theme.backgroundElement }]}
      />
      <View style={styles.titleBlock}>
        <ThemedText type="subtitle" accessibilityRole="header">
          {recipe.name}
        </ThemedText>
        {details !== '' && <ThemedText themeColor="textSecondary">{details}</ThemedText>}
      </View>
      {actions}
      {recipe.youtubeUrl && (
        <LinkButton label="Watch video" url={recipe.youtubeUrl} icon={{ sf: 'play.rectangle', md: 'smart_display' }} />
      )}
      <ThemedText type="heading" accessibilityRole="header">
        Ingredients
      </ThemedText>
      <IngredientList ingredients={recipe.ingredients} />
    </View>
  );

  const instructions = (
    <View style={styles.section}>
      <ThemedText type="heading" accessibilityRole="header">
        Instructions
      </ThemedText>
      {toParagraphs(recipe.instructions).map((paragraph, index) => (
        <ThemedText key={index} style={styles.paragraph}>
          {paragraph}
        </ThemedText>
      ))}
      {recipe.sourceUrl && (
        <LinkButton label="Original recipe" url={recipe.sourceUrl} icon={{ sf: 'safari', md: 'open_in_new' }} />
      )}
    </View>
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingLeft: Spacing.three + insets.left,
          paddingRight: Spacing.three + insets.right,
          paddingBottom: Spacing.five + insets.bottom,
        },
      ]}>
      {isWide ? (
        <View style={styles.columns}>
          <View style={styles.sideColumn}>{overview}</View>
          <View style={styles.mainColumn}>{instructions}</View>
        </View>
      ) : (
        <View style={styles.stack}>
          {overview}
          {instructions}
        </View>
      )}
    </ScrollView>
  );
}

/** TheMealDB separates steps with line breaks (\r\n). */
function toParagraphs(instructions: string | null): string[] {
  return (instructions ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.three,
  },
  stack: {
    gap: Spacing.five,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  columns: {
    flexDirection: 'row',
    gap: Spacing.five,
  },
  sideColumn: {
    flex: 2,
  },
  mainColumn: {
    flex: 3,
    maxWidth: MaxContentWidth,
  },
  section: {
    gap: Spacing.three,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Spacing.three,
  },
  titleBlock: {
    gap: Spacing.one,
  },
  paragraph: {
    lineHeight: 26,
  },
});
