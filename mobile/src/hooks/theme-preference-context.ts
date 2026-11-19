import { createContext } from 'react';

import type { ThemePreference } from '@/types/settings';

/**
 * The person's chosen theme, read by `useColorScheme()`. Provided by `SettingsProvider`;
 * "system" until the settings are loaded.
 */
export const ThemePreferenceContext = createContext<ThemePreference>('system');
