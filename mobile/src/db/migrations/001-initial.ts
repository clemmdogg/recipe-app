import type { Migration } from '@/db/types';

/*
 * Conventions for every table:
 * - `id` is a UUID (TEXT), except `recipes.id`, which is TheMealDB's `idMeal`.
 * - `created_at`, `updated_at` and `deleted_at` are ISO 8601 UTC strings. A row with
 *   `deleted_at` set is soft-deleted, which lets deletions sync to the cloud later.
 * - Booleans are INTEGER 0/1. Calendar dates (no time) are 'YYYY-MM-DD'.
 * - STRICT tables make SQLite enforce the declared column types.
 */
export const initialMigration: Migration = {
  version: 1,
  name: 'initial',
  sql: `
    CREATE TABLE recipes (
      id            TEXT PRIMARY KEY NOT NULL,
      name          TEXT NOT NULL,
      category      TEXT,
      area          TEXT,
      instructions  TEXT,
      thumbnail_url TEXT,
      youtube_url   TEXT,
      source_url    TEXT,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      deleted_at    TEXT
    ) STRICT;

    CREATE TABLE recipe_ingredients (
      id              TEXT PRIMARY KEY NOT NULL,
      recipe_id       TEXT NOT NULL REFERENCES recipes (id),
      position        INTEGER NOT NULL,
      ingredient_name TEXT NOT NULL,
      measure         TEXT NOT NULL DEFAULT '',
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL,
      deleted_at      TEXT
    ) STRICT;
    CREATE INDEX recipe_ingredients_recipe_id ON recipe_ingredients (recipe_id);

    CREATE TABLE meal_plan_entries (
      id         TEXT PRIMARY KEY NOT NULL,
      date       TEXT NOT NULL,
      recipe_id  TEXT NOT NULL REFERENCES recipes (id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    ) STRICT;
    CREATE INDEX meal_plan_entries_date ON meal_plan_entries (date);

    CREATE TABLE shopping_lists (
      id         TEXT PRIMARY KEY NOT NULL,
      name       TEXT NOT NULL,
      start_date TEXT,
      end_date   TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    ) STRICT;

    CREATE TABLE shopping_list_items (
      id               TEXT PRIMARY KEY NOT NULL,
      shopping_list_id TEXT NOT NULL REFERENCES shopping_lists (id),
      ingredient_name  TEXT NOT NULL,
      measure          TEXT NOT NULL DEFAULT '',
      recipe_id        TEXT REFERENCES recipes (id),
      is_checked       INTEGER NOT NULL DEFAULT 0 CHECK (is_checked IN (0, 1)),
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL,
      deleted_at       TEXT
    ) STRICT;
    CREATE INDEX shopping_list_items_shopping_list_id ON shopping_list_items (shopping_list_id);

    CREATE TABLE pantry_items (
      id              TEXT PRIMARY KEY NOT NULL,
      ingredient_name TEXT NOT NULL COLLATE NOCASE,
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL,
      deleted_at      TEXT
    ) STRICT;
    -- An ingredient can only be in the pantry once (case-insensitive), ignoring soft-deleted rows.
    CREATE UNIQUE INDEX pantry_items_ingredient_name
      ON pantry_items (ingredient_name) WHERE deleted_at IS NULL;
  `,
};
