import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
};

/** Large, high-contrast button for the main action on a screen. */
export function PrimaryButton({ label, onPress }: PrimaryButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, { backgroundColor: theme.text }, pressed && styles.pressed]}>
      <ThemedText style={[styles.label, { color: theme.background }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
  },
  label: {
    fontSize: 17,
    fontWeight: 600,
  },
  pressed: {
    opacity: 0.7,
  },
});
