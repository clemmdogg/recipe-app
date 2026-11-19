import { useContext, useSyncExternalStore } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { ThemePreferenceContext } from '@/hooks/theme-preference-context';

const subscribe = () => () => {};

/**
 * "light" or "dark": the person's choice, or the browser's own mode when they chose "system".
 * To support static rendering, the browser's mode is only read on the client: the server
 * snapshot is `false` and the client snapshot is `true`, so React re-renders after hydration.
 */
export function useColorScheme(): 'light' | 'dark' | null | undefined {
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const preference = useContext(ThemePreferenceContext);
  const systemScheme = useSystemColorScheme();

  if (preference !== 'system') {
    return preference;
  }
  return hasHydrated ? systemScheme : 'light';
}
