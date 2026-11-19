import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isHovered } from '@/utils/pressable';

type SurpriseButtonProps = {
  onPress: () => void;
  isBusy: boolean;
  /** Mentions shaking only where it works (a phone with shaking turned on). */
  canShake: boolean;
};

/** Opens a random recipe, for when the family can't decide what to have. */
export function SurpriseButton({ onPress, isBusy, canShake }: SurpriseButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={isBusy}
      accessibilityRole="button"
      accessibilityLabel="Surprise me with a random recipe"
      accessibilityHint={canShake ? 'You can also shake your phone' : undefined}
      accessibilityState={{ busy: isBusy, disabled: isBusy }}
      style={(state) => [
        styles.button,
        { backgroundColor: isHovered(state) ? theme.backgroundSelected : theme.backgroundElement },
        (state.pressed || isBusy) && styles.pressed,
      ]}>
      <View style={styles.icon}>
        {isBusy ? (
          <ActivityIndicator color={theme.text} />
        ) : (
          <SymbolView
            name={{ ios: 'dice', android: 'casino', web: 'casino' }}
            size={24}
            tintColor={theme.accent}
          />
        )}
      </View>
      <View style={styles.text}>
        <ThemedText type="smallBold">Surprise me</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {canShake ? 'Or shake your phone for a random dinner' : 'A random dinner idea'}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  icon: {
    width: 28,
    alignItems: 'center',
  },
  text: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
