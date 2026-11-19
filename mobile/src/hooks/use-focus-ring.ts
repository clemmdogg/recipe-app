import { useState } from 'react';
import { Platform, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * A terracotta border around a text field while it has focus, in browsers. Browsers draw their
 * own black outline on the focused input instead, which looks out of place; that is turned off
 * with `outlineWidth: 0` on the input. Keyboard users still see where they are typing.
 * Phones show the cursor and keyboard, so their design stays as it is.
 */
export function useFocusRing(): {
  inputProps: { onFocus?: () => void; onBlur?: () => void };
  ringStyle: ViewStyle | null;
} {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  if (Platform.OS !== 'web') {
    return { inputProps: {}, ringStyle: null };
  }
  return {
    inputProps: { onFocus: () => setIsFocused(true), onBlur: () => setIsFocused(false) },
    // Always 2 wide, transparent when not focused, so the field doesn't move when focused.
    ringStyle: { borderWidth: 2, borderColor: isFocused ? theme.accent : 'transparent' },
  };
}
