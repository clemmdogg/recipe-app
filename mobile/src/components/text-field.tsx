import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useFocusRing } from '@/hooks/use-focus-ring';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  /** Shown above the field and read by screen readers. */
  label: string;
};

/** A labelled, large text field for forms, styled like the search field. */
export function TextField({ label, onFocus, onBlur, ...inputProps }: TextFieldProps) {
  const theme = useTheme();
  const focusRing = useFocusRing();

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }, focusRing.ringStyle]}
        {...inputProps}
        // Keep any focus handlers the screen passes, as well as the focus ring's.
        onFocus={(event) => {
          focusRing.inputProps.onFocus?.();
          onFocus?.(event);
        }}
        onBlur={(event) => {
          focusRing.inputProps.onBlur?.();
          onBlur?.(event);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    fontSize: 17,
    // The browser's own focus outline; the field's border shows focus instead (useFocusRing).
    outlineWidth: 0,
  },
});
