import { Pressable, StyleSheet } from 'react-native';

import { HeartIcon } from '@/components/recipes/heart-icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SaveRecipeButtonProps = {
  isSaved: boolean;
  disabled?: boolean;
  onPress: () => void;
};

/**
 * Large save toggle for the recipe screen. Unsaved: a bold call to action.
 * Saved: a calm "Saved" state with a filled red heart; tapping again removes it.
 */
export function SaveRecipeButton({ isSaved, disabled = false, onPress }: SaveRecipeButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={isSaved ? 'Saved. Tap to remove from saved recipes' : 'Save recipe'}
      accessibilityState={{ selected: isSaved, disabled }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: isSaved ? theme.backgroundElement : theme.text },
        (pressed || disabled) && styles.pressed,
      ]}>
      <HeartIcon filled={isSaved} size={22} outlineColor={theme.background} />
      <ThemedText style={[styles.label, { color: isSaved ? theme.text : theme.background }]}>
        {isSaved ? 'Saved' : 'Save recipe'}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 52,
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
