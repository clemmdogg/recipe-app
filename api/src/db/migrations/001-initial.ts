import type { Migration } from './types.ts';

/*
 * Accounts, households, and the household data that mirrors the app's SQLite tables.
 *
 * Conventions for household data tables (see api/docs/api-design.md, section 5):
 * - The primary key is (household_id, id). Name-based ids such as a pantry item's are the same
 *   in every household, so `id` alone isn't unique across households.
 * - Foreign keys include household_id, so a row can never point into another household.
 * - `change_number` comes from one shared sequence. The `touch_row` trigger gives a row a new
 *   change number and sets `updated_at` on every update, so the server always sets both.
 * - `deleted_at` set means soft-deleted, so deletions sync to other devices.
 */
export const initialMigration: Migration = {
  version: 1,
  name: 'initial',
  sql: `
    -- Accounts --------------------------------------------------------------------------------

    CREATE TABLE households (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name       text NOT NULL,
      created_by uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE users (
      id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email               text NOT NULL UNIQUE CHECK (email = lower(email)),
      password_hash       text NOT NULL,
      name                text NOT NULL,
      household_id        uuid NOT NULL REFERENCES households (id) DEFERRABLE INITIALLY DEFERRED,
      joined_household_at timestamptz NOT NULL DEFAULT now(),
      created_at          timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX users_household_id ON users (household_id);

    -- A household and its creator are created together, so this check waits until the end of
    -- the transaction.
    ALTER TABLE households
      ADD FOREIGN KEY (created_by) REFERENCES users (id) DEFERRABLE INITIALLY DEFERRED;

    CREATE TABLE invites (
      code         text PRIMARY KEY,
      household_id uuid NOT NULL REFERENCES households (id) ON DELETE CASCADE,
      created_by   uuid REFERENCES users (id) ON DELETE SET NULL,
      expires_at   timestamptz NOT NULL,
      created_at   timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE refresh_tokens (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      token_hash  text NOT NULL UNIQUE,
      expires_at  timestamptz NOT NULL,
      revoked_at  timestamptz,
      replaced_by uuid REFERENCES refresh_tokens (id) ON DELETE SET NULL,
      created_at  timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX refresh_tokens_user_id ON refresh_tokens (user_id);

    -- Sync bookkeeping ------------------------------------------------------------------------

    CREATE SEQUENCE change_numbers;

    CREATE FUNCTION touch_row() RETURNS trigger AS $$
    BEGIN
      NEW.change_number := nextval('change_numbers');
      NEW.updated_at := now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Household data --------------------------------------------------------------------------

    CREATE TABLE recipes (
      household_id  uuid NOT NULL REFERENCES households (id) ON DELETE CASCADE,
      id            text NOT NULL,
      name          text NOT NULL,
      category      text,
      area          text,
      instructions  text,
      thumbnail_url text,
      youtube_url   text,
      source_url    text,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now(),
      deleted_at    timestamptz,
      change_number bigint NOT NULL DEFAULT nextval('change_numbers'),
      PRIMARY KEY (household_id, id)
    );

    CREATE TABLE recipe_ingredients (
      household_id    uuid NOT NULL REFERENCES households (id) ON DELETE CASCADE,
      id              uuid NOT NULL,
      recipe_id       text NOT NULL,
      position        integer NOT NULL,
      ingredient_name text NOT NULL,
      measure         text NOT NULL DEFAULT '',
      created_at      timestamptz NOT NULL DEFAULT now(),
      updated_at      timestamptz NOT NULL DEFAULT now(),
      deleted_at      timestamptz,
      change_number   bigint NOT NULL DEFAULT nextval('change_numbers'),
      PRIMARY KEY (household_id, id),
      FOREIGN KEY (household_id, recipe_id) REFERENCES recipes (household_id, id)
    );

    CREATE TABLE meal_plan_entries (
      household_id  uuid NOT NULL REFERENCES households (id) ON DELETE CASCADE,
      id            uuid NOT NULL,
      date          date NOT NULL,
      recipe_id     text NOT NULL,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now(),
      deleted_at    timestamptz,
      change_number bigint NOT NULL DEFAULT nextval('change_numbers'),
      PRIMARY KEY (household_id, id),
      FOREIGN KEY (household_id, recipe_id) REFERENCES recipes (household_id, id)
    );

    CREATE TABLE shopping_lists (
      household_id  uuid NOT NULL REFERENCES households (id) ON DELETE CASCADE,
      id            uuid NOT NULL,
      name          text NOT NULL,
      start_date    date,
      end_date      date,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now(),
      deleted_at    timestamptz,
      change_number bigint NOT NULL DEFAULT nextval('change_numbers'),
      PRIMARY KEY (household_id, id)
    );

    CREATE TABLE shopping_list_items (
      household_id     uuid NOT NULL REFERENCES households (id) ON DELETE CASCADE,
      id               uuid NOT NULL,
      shopping_list_id uuid NOT NULL,
      ingredient_name  text NOT NULL,
      measure          text NOT NULL DEFAULT '',
      recipe_id        text,
      is_checked       boolean NOT NULL DEFAULT false,
      created_at       timestamptz NOT NULL DEFAULT now(),
      updated_at       timestamptz NOT NULL DEFAULT now(),
      deleted_at       timestamptz,
      change_number    bigint NOT NULL DEFAULT nextval('change_numbers'),
      PRIMARY KEY (household_id, id),
      FOREIGN KEY (household_id, shopping_list_id) REFERENCES shopping_lists (household_id, id),
      -- Not checked when recipe_id is NULL (items added by hand).
      FOREIGN KEY (household_id, recipe_id) REFERENCES recipes (household_id, id)
    );

    CREATE TABLE pantry_items (
      household_id    uuid NOT NULL REFERENCES households (id) ON DELETE CASCADE,
      id              uuid NOT NULL,
      ingredient_name text NOT NULL,
      created_at      timestamptz NOT NULL DEFAULT now(),
      updated_at      timestamptz NOT NULL DEFAULT now(),
      deleted_at      timestamptz,
      change_number   bigint NOT NULL DEFAULT nextval('change_numbers'),
      PRIMARY KEY (household_id, id)
    );
    -- An ingredient can only be in a pantry once (any letter case), ignoring deleted rows.
    CREATE UNIQUE INDEX pantry_items_ingredient_name
      ON pantry_items (household_id, lower(ingredient_name)) WHERE deleted_at IS NULL;

    -- Pulling changes reads "rows in this household with a change number above X".
    CREATE INDEX recipes_changes             ON recipes             (household_id, change_number);
    CREATE INDEX recipe_ingredients_changes  ON recipe_ingredients  (household_id, change_number);
    CREATE INDEX meal_plan_entries_changes   ON meal_plan_entries   (household_id, change_number);
    CREATE INDEX shopping_lists_changes      ON shopping_lists      (household_id, change_number);
    CREATE INDEX shopping_list_items_changes ON shopping_list_items (household_id, change_number);
    CREATE INDEX pantry_items_changes        ON pantry_items        (household_id, change_number);

    CREATE TRIGGER recipes_touch             BEFORE UPDATE ON recipes             FOR EACH ROW EXECUTE FUNCTION touch_row();
    CREATE TRIGGER recipe_ingredients_touch  BEFORE UPDATE ON recipe_ingredients  FOR EACH ROW EXECUTE FUNCTION touch_row();
    CREATE TRIGGER meal_plan_entries_touch   BEFORE UPDATE ON meal_plan_entries   FOR EACH ROW EXECUTE FUNCTION touch_row();
    CREATE TRIGGER shopping_lists_touch      BEFORE UPDATE ON shopping_lists      FOR EACH ROW EXECUTE FUNCTION touch_row();
    CREATE TRIGGER shopping_list_items_touch BEFORE UPDATE ON shopping_list_items FOR EACH ROW EXECUTE FUNCTION touch_row();
    CREATE TRIGGER pantry_items_touch        BEFORE UPDATE ON pantry_items        FOR EACH ROW EXECUTE FUNCTION touch_row();
  `,
};
