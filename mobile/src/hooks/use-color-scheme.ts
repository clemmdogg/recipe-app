import { useContext } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { ThemePreferenceContext } from '@/hooks/theme-preference-context';

/** "light" or "dark": the person's choice, or the phone's own mode when they chose "system". */
export function useColorScheme(): 'light' | 'dark' | null | undefined {
  const preference = useContext(ThemePreferenceContext);
  const systemScheme = useSystemColorScheme();
  return preference === 'system' ? systemScheme : preference;
}
