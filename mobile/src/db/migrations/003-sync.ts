import type { Migration } from '@/db/types';

/** The household data tables that sync with the API. The ingredient catalog is not one of them. */
export const SyncedTables = [
  'recipes',
  'recipe_ingredients',
  'meal_plan_entries',
  'shopping_lists',
  'shopping_list_items',
  'pantry_items',
] as const;

/*
 * Gets the household data ready for sync with the API (see api/docs/api-design.md, section 8):
 *
 * - `change_number`: the server's change number for the row, saved when it is pulled. NULL for
 *   rows the server hasn't sent yet.
 * - `needs_push`: 1 when this device changed the row and hasn't uploaded the change yet.
 *
 * Triggers set `needs_push` on every change the app makes, so the repository functions don't
 * have to. They tell the app's own changes apart from rows applied by a pull, because a pull
 * always writes a new change_number and the app never does. Clearing the flag after a push
 * changes `needs_push` itself, so it doesn't set it again either.
 *
 * Existing rows are marked too: the student decided that data from before login is uploaded to
 * the household on the first sync.
 */
function syncColumnsAndTriggers(table: string): string {
  return `
    ALTER TABLE ${table} ADD COLUMN change_number INTEGER;
    ALTER TABLE ${table} ADD COLUMN needs_push INTEGER NOT NULL DEFAULT 0 CHECK (needs_push IN (0, 1));
    UPDATE ${table} SET needs_push = 1;
    CREATE INDEX ${table}_needs_push ON ${table} (needs_push) WHERE needs_push = 1;

    CREATE TRIGGER ${table}_changed_on_insert AFTER INSERT ON ${table}
    WHEN NEW.change_number IS NULL AND NEW.needs_push = 0
    BEGIN
      UPDATE ${table} SET needs_push = 1 WHERE id = NEW.id;
    END;

    CREATE TRIGGER ${table}_changed_on_update AFTER UPDATE ON ${table}
    WHEN NEW.needs_push = 0
      AND OLD.needs_push = 0
      AND NEW.change_number IS OLD.change_number
    BEGIN
      UPDATE ${table} SET needs_push = 1 WHERE id = NEW.id;
    END;
  `;
}

export const syncMigration: Migration = {
  version: 3,
  name: 'sync',
  sql: `
    ${SyncedTables.map(syncColumnsAndTriggers).join('\n')}

    -- Sync bookkeeping such as the last pull's cursor. Device state, not household data, so it
    -- is never synced and doesn't follow the UUID and timestamp conventions (like ingredients).
    CREATE TABLE sync_state (
      key   TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    ) STRICT;
  `,
};
