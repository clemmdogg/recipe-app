import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { IngredientRow } from '@/components/pantry/ingredient-row';
import { FilledSymbolWeight } from '@/constants/symbols';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ShoppingLine } from '@/types/shopping-list';
import { formatWeekday, fromDateKey } from '@/utils/dates';

/**
 * Side by side, "To buy" and "Already at home" rows get the same height (room for a name and two
 * lines of detail), so they line up across the columns.
 */
export const AlignedRowMinHeight = 76;
/** Section headings get the same height too, so the first rows start level. */
export const AlignedHeadingMinHeight = 44;

type ShoppingLineRowProps = {
  line: ShoppingLine;
  isChecked: boolean;
  /** Use the shared row height, for the two-column layout. */
  isAligned?: boolean;
  onToggle: () => void;
  /** Shown for lines added by hand, which can be removed. */
  onRemove?: () => void;
};

/** A shopping list line. Tapping anywhere on it ticks it off. */
export function ShoppingLineRow({ line, isChecked, isAligned = false, onToggle, onRemove }: ShoppingLineRowProps) {
  const theme = useTheme();
  const detail = describeUses(line);

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isChecked }}
      accessibilityLabel={detail ? `${line.name}, ${detail}` : line.name}
      style={({ pressed }) => [
        styles.row,
        isAligned && styles.aligned,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <IngredientRow
        name={line.name}
        detail={detail}
        struck={isChecked}
        leading={
          <SymbolView
            // SymbolView loads its font on mount, so remount when switching to the filled icon.
            key={isChecked ? 'checked' : 'unchecked'}
            name={{
              ios: isChecked ? 'checkmark.circle.fill' : 'circle',
              android: isChecked ? 'check_circle' : 'radio_button_unchecked',
              web: isChecked ? 'check_circle' : 'radio_button_unchecked',
            }}
            weight={isChecked ? FilledSymbolWeight : undefined}
            size={28}
            tintColor={isChecked ? theme.textSecondary : theme.text}
          />
        }
        trailing={
          onRemove && (
            <Pressable
              onPress={onRemove}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${line.name} from the list`}
              style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                size={24}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          )
        }
      />
    </Pressable>
  );
}

/** "3 cloves · Pasta (Mon), 2 cloves · Curry (Thu)", or "Added by you" for extra items. */
export function describeUses(line: ShoppingLine): string {
  if (line.uses.length === 0) {
    return 'Added by you';
  }
  return line.uses
    .map((use) => {
      const dinner = `${use.recipeName} (${formatWeekday(fromDateKey(use.date))})`;
      return use.measure ? `${use.measure} · ${dinner}` : dinner;
    })
    .join(', ');
}

const styles = StyleSheet.create({
  row: {
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
  },
  aligned: {
    minHeight: AlignedRowMinHeight,
    justifyContent: 'center',
  },
  removeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
