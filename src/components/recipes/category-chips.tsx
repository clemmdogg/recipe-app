import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CategoryChipsProps = {
  categories: string[];
  selected: string | null;
  /** Called with the tapped category, or `null` when the selected one is tapped again. */
  onSelect: (category: string | null) => void;
};

export function CategoryChips({ categories, selected, onSelect }: CategoryChipsProps) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel="Recipe categories">
      {categories.map((category) => {
        const isSelected = category === selected;
        return (
          <Pressable
            key={category}
            onPress={() => onSelect(isSelected ? null : category)}
            accessibilityRole="button"
            accessibilityLabel={`${category} recipes`}
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isSelected ? theme.text : theme.backgroundElement,
              },
              pressed && styles.pressed,
            ]}>
            <ThemedText
              type="smallBold"
              style={{ color: isSelected ? theme.background : theme.text }}>
              {category}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});
