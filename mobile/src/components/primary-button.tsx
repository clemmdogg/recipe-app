import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  /** Shows a spinner and ignores presses, e.g. while signing in. */
  isBusy?: boolean;
};

/** Large, high-contrast button for the main action on a screen. */
export function PrimaryButton({ label, onPress, isBusy = false }: PrimaryButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={isBusy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: isBusy, disabled: isBusy }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.text },
        (pressed || isBusy) && styles.pressed,
      ]}>
      {isBusy ? (
        <ActivityIndicator color={theme.background} />
      ) : (
        <ThemedText style={[styles.label, { color: theme.background }]}>{label}</ThemedText>
      )}
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
