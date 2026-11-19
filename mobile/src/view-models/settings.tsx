import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance, Platform } from 'react-native';

import { useDatabase } from '@/db/use-database';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { ThemePreferenceContext } from '@/hooks/theme-preference-context';
import { getDeviceSettings, updateDeviceSettings } from '@/repositories/settings';
import { DefaultDeviceSettings, type DeviceSettings } from '@/types/settings';

type SettingsContextValue = {
  settings: DeviceSettings;
  /** Applies the change at once and saves it on the device. */
  update: (changes: Partial<DeviceSettings>) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Loads this device's personal settings and shares them with every screen. Needs the database,
 * so it sits inside `SQLiteProvider`. It also hands the theme to `useColorScheme()`.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const db = useDatabase();
  const stored = useAsyncResource('device-settings', () => getDeviceSettings(db));
  // Changes show at once, before the save finishes.
  const [changes, setChanges] = useState<Partial<DeviceSettings>>({});
  const settings: DeviceSettings = { ...DefaultDeviceSettings, ...stored.data, ...changes };

  // Native parts drawn by the system (keyboard, dialogs, date pickers) follow the chosen theme too.
  // Browsers have no such override.
  useEffect(() => {
    if (Platform.OS !== 'web') {
      Appearance.setColorScheme(settings.theme === 'system' ? 'unspecified' : settings.theme);
    }
  }, [settings.theme]);

  const update = async (newChanges: Partial<DeviceSettings>) => {
    setChanges((previous) => ({ ...previous, ...newChanges }));
    await updateDeviceSettings(db, newChanges);
  };

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      <ThemePreferenceContext.Provider value={settings.theme}>{children}</ThemePreferenceContext.Provider>
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error('useSettings must be used inside SettingsProvider.');
  }
  return value;
}
