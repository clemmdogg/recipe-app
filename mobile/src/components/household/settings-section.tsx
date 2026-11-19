import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DeviceSettings, ThemePreference } from '@/types/settings';

type SettingsSectionProps = {
  settings: DeviceSettings;
  onChange: (changes: Partial<DeviceSettings>) => void;
  /** Shaking needs an accelerometer, which browsers here don't use. */
  showShakeSetting: boolean;
};

const ThemeOptions: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** Personal settings, saved only on this device. */
export function SettingsSection({ settings, onChange, showShakeSetting }: SettingsSectionProps) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText type="heading" accessibilityRole="header">
        Settings
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Saved on this device only.
      </ThemedText>

      <ThemedText type="smallBold">Appearance</ThemedText>
      <View style={[styles.segments, { backgroundColor: theme.backgroundElement }]} accessibilityRole="radiogroup">
        {ThemeOptions.map((option) => {
          const isSelected = settings.theme === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange({ theme: option.value })}
              accessibilityRole="radio"
              accessibilityLabel={`${option.label} appearance`}
              accessibilityState={{ checked: isSelected }}
              style={({ pressed }) => [
                styles.segment,
                isSelected && { backgroundColor: theme.text },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: isSelected ? theme.background : theme.text }}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {showShakeSetting && (
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <ThemedText type="smallBold">Shake for a recipe</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Shake your phone on the Recipes tab to get a random dinner idea.
            </ThemedText>
          </View>
          <Switch
            value={settings.shakeForRecipe}
            onValueChange={(value) => onChange({ shakeForRecipe: value })}
            accessibilityLabel="Shake for a recipe"
            trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  segments: {
    flexDirection: 'row',
    padding: Spacing.one,
    borderRadius: Spacing.five,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Spacing.five,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  switchText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
