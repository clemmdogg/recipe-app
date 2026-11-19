import { createTestDatabase } from '../../jest/node-sqlite-database';

import { initializeDatabase } from '@/db/initialize';
import { clearHouseholdData } from '@/repositories/local-data';
import { getDeviceSettings, updateDeviceSettings } from '@/repositories/settings';
import { DefaultDeviceSettings } from '@/types/settings';

let db: ReturnType<typeof createTestDatabase>;

beforeEach(async () => {
  db = createTestDatabase();
  await initializeDatabase(db);
});

afterEach(() => {
  db.close();
});

describe('device settings', () => {
  it('gives the defaults before anything is saved', async () => {
    await expect(getDeviceSettings(db)).resolves.toEqual(DefaultDeviceSettings);
  });

  it('saves a change and keeps the other settings', async () => {
    await updateDeviceSettings(db, { theme: 'dark' });

    await expect(getDeviceSettings(db)).resolves.toEqual({ theme: 'dark', shakeForRecipe: true });
  });

  it('overwrites an earlier value', async () => {
    await updateDeviceSettings(db, { theme: 'dark', shakeForRecipe: false });
    await updateDeviceSettings(db, { theme: 'light' });

    await expect(getDeviceSettings(db)).resolves.toEqual({ theme: 'light', shakeForRecipe: false });
  });

  it('falls back to the default for a stored value it does not understand', async () => {
    const now = new Date().toISOString();
    await db.runAsync('INSERT INTO device_settings (key, value, updated_at) VALUES (?, ?, ?)', 'theme', '"purple"', now);
    await db.runAsync('INSERT INTO device_settings (key, value, updated_at) VALUES (?, ?, ?)', 'shakeForRecipe', 'not json', now);
    await db.runAsync('INSERT INTO device_settings (key, value, updated_at) VALUES (?, ?, ?)', 'unknown', '1', now);

    await expect(getDeviceSettings(db)).resolves.toEqual(DefaultDeviceSettings);
  });

  it('keeps the settings when the household data is cleared at sign-out', async () => {
    await updateDeviceSettings(db, { theme: 'dark' });

    await clearHouseholdData(db);

    await expect(getDeviceSettings(db)).resolves.toMatchObject({ theme: 'dark' });
  });
});
