import type { Migration } from '@/db/types';

/*
 * Personal settings for this device, such as light or dark mode. They belong to the person
 * holding the phone, not the household, so they are never synced and survive signing out
 * (an agreed exception to the UUID and soft-delete conventions, like `sync_state`).
 */
export const deviceSettingsMigration: Migration = {
  version: 4,
  name: 'device-settings',
  sql: `
    CREATE TABLE device_settings (
      key        TEXT PRIMARY KEY NOT NULL,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;
  `,
};
