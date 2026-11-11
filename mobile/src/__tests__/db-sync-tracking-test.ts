import { createTestDatabase } from '../../jest/node-sqlite-database';

import { initializeDatabase } from '@/db/initialize';
import { Migrations } from '@/db/migrations';
import { SyncedTables } from '@/db/migrations/003-sync';
import { addToPlan, removeFromPlan } from '@/repositories/meal-plan';
import { addToPantry, getPantryItems, removeFromPantry } from '@/repositories/pantry';
import { saveRecipe } from '@/repositories/recipes';
import { checkShoppingItem } from '@/repositories/shopping-list';
import type { Recipe } from '@/types/recipe';

const soup: Recipe = {
  id: '52800',
  name: 'Tomato Soup',
  category: 'Vegetarian',
  area: 'British',
  instructions: 'Simmer.',
  thumbnailUrl: null,
  youtubeUrl: null,
  sourceUrl: null,
  ingredients: [{ name: 'tomato', measure: '6' }],
};

let db: ReturnType<typeof createTestDatabase>;

beforeEach(() => {
  db = createTestDatabase();
});

afterEach(() => {
  db.close();
});

type SyncColumns = { needs_push: number; change_number: number | null };

async function syncColumns(table: string, id: string): Promise<SyncColumns | null> {
  return db.getFirstAsync<SyncColumns>(
    `SELECT needs_push, change_number FROM ${table} WHERE id = ?`,
    id
  );
}

/** Rows of `table` waiting to be uploaded. */
async function waitingRows(table: string): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT count(*) AS count FROM ${table} WHERE needs_push = 1`
  );
  return row?.count ?? 0;
}

/** What a finished push will do: clear the flag. */
async function markPushed(table: string): Promise<void> {
  await db.runAsync(`UPDATE ${table} SET needs_push = 0`);
}

describe('migration 003', () => {
  it('marks data from before login for upload', async () => {
    await initializeDatabase(db, Migrations.slice(0, 2));
    await addToPantry(db, 'Salt');

    await initializeDatabase(db);

    const [salt] = await getPantryItems(db);
    expect(await syncColumns('pantry_items', salt!.id)).toEqual({ needs_push: 1, change_number: null });
  });
});

describe('tracking local changes', () => {
  beforeEach(async () => {
    await initializeDatabase(db);
  });

  it('marks every synced table when the app changes it', async () => {
    await saveRecipe(db, soup);
    await addToPlan(db, soup.id, '2026-11-14');
    await checkShoppingItem(db, '2026-11-09', 'tomato');
    await addToPantry(db, 'Salt');

    for (const table of SyncedTables) {
      expect({ table, waiting: await waitingRows(table) }).toEqual({ table, waiting: 1 });
    }
  });

  it('marks a row again when it is changed after a push', async () => {
    await addToPantry(db, 'Salt');
    await markPushed('pantry_items');
    const [salt] = await getPantryItems(db);

    await removeFromPantry(db, salt!.id);

    expect((await syncColumns('pantry_items', salt!.id))?.needs_push).toBe(1);
  });

  it('keeps the mark when clearing it is the change', async () => {
    const entryId = await addToPlanAfterSaving();
    await markPushed('meal_plan_entries');

    expect((await syncColumns('meal_plan_entries', entryId))?.needs_push).toBe(0);
    await removeFromPlan(db, entryId);
    expect((await syncColumns('meal_plan_entries', entryId))?.needs_push).toBe(1);
  });

  it("doesn't mark rows that come from the server", async () => {
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO pantry_items (id, ingredient_name, created_at, updated_at, change_number)
       VALUES ('from-server', 'Pepper', ?, ?, 41)`,
      now,
      now
    );
    expect(await syncColumns('pantry_items', 'from-server')).toEqual({ needs_push: 0, change_number: 41 });

    await db.runAsync(
      `UPDATE pantry_items SET ingredient_name = 'Black pepper', change_number = 57 WHERE id = 'from-server'`
    );

    expect(await syncColumns('pantry_items', 'from-server')).toEqual({ needs_push: 0, change_number: 57 });
  });

  it('marks a server row when the app then changes it', async () => {
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO pantry_items (id, ingredient_name, created_at, updated_at, change_number)
       VALUES ('from-server', 'Pepper', ?, ?, 41)`,
      now,
      now
    );

    await removeFromPantry(db, 'from-server');

    expect(await syncColumns('pantry_items', 'from-server')).toEqual({ needs_push: 1, change_number: 41 });
  });
});

async function addToPlanAfterSaving(): Promise<string> {
  await saveRecipe(db, soup);
  return addToPlan(db, soup.id, '2026-11-14');
}
