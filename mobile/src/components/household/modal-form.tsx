import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ModalFormProps = {
  intro: string;
  error: string | null;
  children: ReactNode;
};

/** The layout of the small forms opened from the Household tab: an intro, fields and an error. */
export function ModalForm({ intro, error, children }: ModalFormProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingBottom: Spacing.five + insets.bottom }]}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled">
      <View style={styles.column}>
        <ThemedText themeColor="textSecondary">{intro}</ThemedText>
        {children}
        {error && (
          <ThemedText themeColor="error" accessibilityRole="alert" accessibilityLiveRegion="polite">
            {error}
          </ThemedText>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    padding: Spacing.four,
  },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
});
