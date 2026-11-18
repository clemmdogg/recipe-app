import { StyleSheet, View } from 'react-native';

import {
  AlignedHeadingMinHeight,
  ShoppingLineRow,
} from '@/components/shopping/shopping-line-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ShoppingLine } from '@/types/shopping-list';

type LineSectionProps = {
  title: string;
  lines: ShoppingLine[];
  isChecked: boolean;
  /** Shown under the title when the section has no lines. Without it, an empty section is hidden. */
  emptyMessage?: string;
  onToggle: (line: ShoppingLine) => void;
  onRemove: (line: ShoppingLine) => void;
  /** Same heading and row heights as the column beside it. */
  isAligned?: boolean;
};

/** "To buy" or "In cart": a heading with its lines. */
export function LineSection({
  title,
  lines,
  isChecked,
  emptyMessage,
  onToggle,
  onRemove,
  isAligned = false,
}: LineSectionProps) {
  if (lines.length === 0 && !emptyMessage) {
    return null;
  }

  return (
    <View style={styles.section}>
      <ThemedText type="heading" accessibilityRole="header" style={isAligned && styles.alignedHeading}>
        {title} ({lines.length})
      </ThemedText>
      {lines.length === 0 && <ThemedText themeColor="textSecondary">{emptyMessage}</ThemedText>}
      {lines.map((line) => (
        <ShoppingLineRow
          key={line.key}
          line={line}
          isChecked={isChecked}
          isAligned={isAligned}
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
  alignedHeading: {
    minHeight: AlignedHeadingMinHeight,
    textAlignVertical: 'center',
    lineHeight: AlignedHeadingMinHeight,
  },
});
