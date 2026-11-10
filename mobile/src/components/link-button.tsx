import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { Linking, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type LinkButtonProps = {
  label: string;
  url: string;
  icon: { sf: SFSymbol; md: AndroidSymbol };
};

/** Opens an external URL, e.g. a YouTube video (in the YouTube app if installed). */
export function LinkButton({ label, url, icon }: LinkButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <SymbolView
        name={{ ios: icon.sf, android: icon.md, web: icon.md }}
        size={20}
        tintColor={theme.text}
      />
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});
