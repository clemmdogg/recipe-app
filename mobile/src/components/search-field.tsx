import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useFocusRing } from '@/hooks/use-focus-ring';
import { useTheme } from '@/hooks/use-theme';

type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  accessibilityLabel: string;
};

/** A large, always-visible search box with a clear button. */
export function SearchField({ value, onChangeText, placeholder, accessibilityLabel }: SearchFieldProps) {
  const theme = useTheme();
  const focusRing = useFocusRing();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }, focusRing.ringStyle]}>
      <SymbolView
        name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
        size={22}
        tintColor={theme.textSecondary}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
        {...focusRing.inputProps}
        style={[styles.input, { color: theme.text }]}
      />
      {value !== '' && (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={({ pressed }) => pressed && styles.pressed}>
          <SymbolView
            name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
            size={22}
            tintColor={theme.textSecondary}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  input: {
    flex: 1,
    alignSelf: 'stretch',
    fontSize: 17,
    // The browser's own focus outline; the container shows focus instead (useFocusRing).
    // Chrome ignores the width while the outline style is "auto", so set all three.
    outlineStyle: 'solid',
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  pressed: {
    opacity: 0.6,
  },
});
