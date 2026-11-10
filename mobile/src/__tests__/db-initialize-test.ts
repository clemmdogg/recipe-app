import { createTestDatabase } from '../../jest/node-sqlite-database';

import { initializeDatabase } from '@/db/initialize';
import { Migrations } from '@/db/migrations';
import type { Migration } from '@/db/types';

const now = '2026-11-10T12:00:00.000Z';

let db: ReturnType<typeof createTestDatabase>;

beforeEach(() => {
  db = createTestDatabase();
});

afterEach(() => {
  db.close();
});

async function schemaVersion(): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? -1;
}

async function tableNames(): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
  );
  return rows.map((row) => row.name);
}

async function insertRecipe(id: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO recipes (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
    id,
    'Test recipe',
    now,
    now
  );
}

async function insertPantryItem(id: string, name: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO pantry_items (id, ingredient_name, created_at, updated_at) VALUES ($id, $name, $now, $now)',
    { $id: id, $name: name, $now: now }
  );
}

describe('initializeDatabase', () => {
  it('creates every table on a new database and sets the latest version', async () => {
    await initializeDatabase(db);

    expect(await tableNames()).toEqual([
      'ingredients',
      'meal_plan_entries',
      'pantry_items',
      'recipe_ingredients',
      'recipes',
      'shopping_list_items',
      'shopping_lists',
    ]);
    expect(await schemaVersion()).toBe(Migrations.length);
  });

  it('is safe to run again on an up-to-date database', async () => {
    await initializeDatabase(db);
    await insertRecipe('52772');

    await initializeDatabase(db);

    expect(await schemaVersion()).toBe(Migrations.length);
    const recipes = await db.getAllAsync<{ id: string }>('SELECT id FROM recipes');
    expect(recipes).toEqual([{ id: '52772' }]);
  });

  it('runs only pending migrations on an older database', async () => {
    const addColumn: Migration = {
      version: 2,
      name: 'add-test-column',
      sql: 'ALTER TABLE recipes ADD COLUMN test_column TEXT',
    };
    await initializeDatabase(db, [Migrations[0]]);
    await insertRecipe('52772');

    await initializeDatabase(db, [Migrations[0], addColumn]);

    expect(await schemaVersion()).toBe(2);
    const row = await db.getFirstAsync<{ id: string; test_column: string | null }>(
      'SELECT id, test_column FROM recipes'
    );
    expect(row).toEqual({ id: '52772', test_column: null });
  });

  it('rolls back every pending migration when one fails', async () => {
    const broken: Migration = { version: 2, name: 'broken', sql: 'THIS IS NOT SQL' };

    await expect(initializeDatabase(db, [Migrations[0], broken])).rejects.toThrow();

    expect(await tableNames()).toEqual([]);
    expect(await schemaVersion()).toBe(0);
  });

  it('refuses a database that is newer than the app', async () => {
    await db.execAsync('PRAGMA user_version = 99');

    await expect(initializeDatabase(db)).rejects.toThrow(/newer than this app supports/);
  });

  it('rejects migrations that are not numbered 1, 2, 3, ...', async () => {
    const skipped: Migration = { version: 3, name: 'skipped', sql: 'SELECT 1' };

    await expect(initializeDatabase(db, [Migrations[0], skipped])).rejects.toThrow(
      /expected 2/
    );
  });
});

describe('initial schema', () => {
  beforeEach(async () => {
    await initializeDatabase(db);
  });

  it('enforces foreign keys', async () => {
    await expect(
      db.runAsync(
        `INSERT INTO recipe_ingredients
           (id, recipe_id, position, ingredient_name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        'ingredient-1',
        'missing-recipe',
        1,
        'Chicken',
        now,
        now
      )
    ).rejects.toThrow(/FOREIGN KEY/);
  });

  it('enforces column types', async () => {
    await insertRecipe('52772');
    await db.runAsync(
      `INSERT INTO shopping_lists (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      'list-1',
      'This week',
      now,
      now
    );

    await expect(
      db.runAsync(
        `INSERT INTO shopping_list_items
           (id, shopping_list_id, ingredient_name, is_checked, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        'item-1',
        'list-1',
        'Milk',
        'yes',
        now,
        now
      )
    ).rejects.toThrow();
  });

  it('allows an ingredient in the pantry only once, ignoring case', async () => {
    await insertPantryItem('pantry-1', 'Garlic');

    await expect(insertPantryItem('pantry-2', 'garlic')).rejects.toThrow(/UNIQUE/);
  });

  it('allows re-adding a pantry ingredient after it was soft-deleted', async () => {
    await insertPantryItem('pantry-1', 'Garlic');
    await db.runAsync('UPDATE pantry_items SET deleted_at = ? WHERE id = ?', now, 'pantry-1');

    await expect(insertPantryItem('pantry-2', 'Garlic')).resolves.toBeUndefined();
  });
});
