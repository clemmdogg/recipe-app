import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SecondaryButtonProps = {
  label: string;
  onPress: () => void;
  /** "destructive" shows the label in the error color, for actions like deleting. */
  tone?: 'default' | 'destructive';
  isBusy?: boolean;
};

/** A large, quieter button for actions that aren't the main one on the screen. */
export function SecondaryButton({ label, onPress, tone = 'default', isBusy = false }: SecondaryButtonProps) {
  const theme = useTheme();
  const color = tone === 'destructive' ? theme.error : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={isBusy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: isBusy, disabled: isBusy }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.backgroundElement },
        (pressed || isBusy) && styles.pressed,
      ]}>
      {isBusy ? (
        <ActivityIndicator color={color} />
      ) : (
        <ThemedText style={[styles.label, { color }]}>{label}</ThemedText>
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
