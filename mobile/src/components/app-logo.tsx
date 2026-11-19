import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** The app's name, shown next to the logo and on the home screen (app.json). */
export const AppName = 'MealCart';

type AppLogoProps = {
  /** Height of the cart symbol. */
  size?: number;
  /** "stacked": the name under the symbol (sign-in). "inline": beside it (web sidebar). */
  layout?: 'stacked' | 'inline';
};

// The same symbol as the app icon (assets/icon-mealcart.svg), in a terracotta for light mode and a
// lighter one that stands out on the dark background.
const symbolLight = require('@/assets/images/splash-icon.png');
const symbolDark = require('@/assets/images/splash-icon-dark.png');

/** The cart with a fork and spoon, and the app's name: the app's logo inside the app. */
export function AppLogo({ size = 72, layout = 'stacked' }: AppLogoProps) {
  const scheme = useColorScheme();
  const isInline = layout === 'inline';

  return (
    <View
      style={[styles.logo, isInline ? styles.inline : styles.stacked]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={AppName}>
      <Image
        source={scheme === 'dark' ? symbolDark : symbolLight}
        contentFit="contain"
        // The symbol only fills the middle of its square image, so draw it a bit bigger.
        style={{ width: size * 1.6, height: size * 1.6, margin: -size * 0.3 }}
      />
      <ThemedText type={isInline ? 'heading' : 'subtitle'} style={styles.name}>
        {AppName}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    alignItems: 'center',
  },
  stacked: {
    gap: Spacing.two,
  },
  inline: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  name: {
    fontWeight: 700,
  },
});
