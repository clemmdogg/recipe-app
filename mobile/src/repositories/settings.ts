import type { Database } from '@/db/types';
import { DefaultDeviceSettings, type DeviceSettings, type ThemePreference } from '@/types/settings';

type SettingKey = keyof DeviceSettings;

/** Checks each stored value, so an old or broken value falls back to the default. */
const Parsers: { [K in SettingKey]: (value: unknown) => DeviceSettings[K] | undefined } = {
  theme: (value) => (isThemePreference(value) ? value : undefined),
  shakeForRecipe: (value) => (typeof value === 'boolean' ? value : undefined),
};

/** This device's settings, with defaults for anything never changed. */
export async function getDeviceSettings(db: Database): Promise<DeviceSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM device_settings');
  const settings: DeviceSettings = { ...DefaultDeviceSettings };
  for (const row of rows) {
    if (isSettingKey(row.key)) {
      setParsed(settings, row.key, parseJson(row.value));
    }
  }
  return settings;
}

/** Saves the given settings; the others are left as they are. */
export async function updateDeviceSettings(db: Database, changes: Partial<DeviceSettings>): Promise<void> {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const [key, value] of Object.entries(changes)) {
      if (!isSettingKey(key) || value === undefined) {
        continue;
      }
      await db.runAsync(
        `INSERT INTO device_settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        key,
        JSON.stringify(value),
        now
      );
    }
  });
}

function setParsed<K extends SettingKey>(settings: DeviceSettings, key: K, value: unknown): void {
  const parsed = Parsers[key](value);
  if (parsed !== undefined) {
    settings[key] = parsed;
  }
}

function isSettingKey(key: string): key is SettingKey {
  return Object.hasOwn(Parsers, key);
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
