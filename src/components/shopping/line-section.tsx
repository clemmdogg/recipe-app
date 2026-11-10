import { StyleSheet, View } from 'react-native';

import { ShoppingLineRow } from '@/components/shopping/shopping-line-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ShoppingLine } from '@/utils/shopping-list';

type LineSectionProps = {
  title: string;
  lines: ShoppingLine[];
  isChecked: boolean;
  /** Shown under the title when the section has no lines. Without it, an empty section is hidden. */
  emptyMessage?: string;
  onToggle: (line: ShoppingLine) => void;
  onRemove: (line: ShoppingLine) => void;
};

/** "To buy" or "In cart": a heading with its lines. */
export function LineSection({ title, lines, isChecked, emptyMessage, onToggle, onRemove }: LineSectionProps) {
  if (lines.length === 0 && !emptyMessage) {
    return null;
  }

  return (
    <View style={styles.section}>
      <ThemedText type="heading" accessibilityRole="header">
        {title} ({lines.length})
      </ThemedText>
      {lines.length === 0 && <ThemedText themeColor="textSecondary">{emptyMessage}</ThemedText>}
      {lines.map((line) => (
        <ShoppingLineRow
          key={line.key}
          line={line}
          isChecked={isChecked}
          onToggle={() => onToggle(line)}
          // Lines added by hand (or "need more") can be removed; planned lines follow the plan.
          onRemove={!isChecked && line.isStored ? () => onRemove(line) : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
});
