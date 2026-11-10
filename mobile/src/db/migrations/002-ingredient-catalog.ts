import type { Migration } from '@/db/types';

/*
 * A local copy of TheMealDB's ingredient list, so pantry suggestions work offline.
 * This is reference data, not household data: it is never synced and is rebuilt from the API,
 * so it is keyed by name and only tracks when it was last refreshed (an agreed exception to
 * the UUID and soft-delete conventions).
 */
export const ingredientCatalogMigration: Migration = {
  version: 2,
  name: 'ingredient-catalog',
  sql: `
    CREATE TABLE ingredients (
      name       TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
      type       TEXT,
      updated_at TEXT NOT NULL
    ) STRICT;
  `,
};
