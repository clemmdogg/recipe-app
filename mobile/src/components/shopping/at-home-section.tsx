import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IngredientRow } from '@/components/pantry/ingredient-row';
import { AlignedHeadingMinHeight, AlignedRowMinHeight, describeUses } from '@/components/shopping/shopping-line-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ShoppingLine } from '@/types/shopping-list';

type AtHomeSectionProps = {
  lines: ShoppingLine[];
  onNeedMore: (line: ShoppingLine) => void;
  /** Same heading and row heights as the column beside it. */
  isAligned?: boolean;
};

/** Collapsed list of needed ingredients skipped because they're in the pantry. */
export function AtHomeSection({ lines, onNeedMore, isAligned = false }: AtHomeSectionProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  if (lines.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setIsOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={`Already at home, ${lines.length} items`}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}>
        <ThemedText type="heading">Already at home ({lines.length})</ThemedText>
        <SymbolView
          name={{
            ios: isOpen ? 'chevron.up' : 'chevron.down',
            android: isOpen ? 'expand_less' : 'expand_more',
            web: isOpen ? 'expand_less' : 'expand_more',
          }}
          size={22}
          tintColor={theme.textSecondary}
        />
      </Pressable>
      {!isOpen && (
        <ThemedText type="small" themeColor="textSecondary">
          Skipped because they&apos;re in your pantry. Tap to see them.
        </ThemedText>
      )}
      {isOpen &&
        lines.map((line) => (
          <View
            key={line.key}
            style={[styles.row, isAligned && styles.alignedRow, { backgroundColor: theme.backgroundElement }]}>
            <IngredientRow
              name={line.name}
              detail={describeUses(line)}
              trailing={
                <Pressable
                  onPress={() => onNeedMore(line)}
                  accessibilityRole="button"
                  accessibilityLabel={`Need more ${line.name}, add it to the list`}
                  style={({ pressed }) => [
                    styles.needMore,
                    { backgroundColor: theme.background },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold">Need more</ThemedText>
                </Pressable>
              }
            />
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: AlignedHeadingMinHeight,
  },
  alignedRow: {
    minHeight: AlignedRowMinHeight,
    justifyContent: 'center',
  },
  row: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
  },
  needMore: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.6,
  },
});
