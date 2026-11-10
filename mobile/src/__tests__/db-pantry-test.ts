import { createTestDatabase } from '../../jest/node-sqlite-database';

import {
  getIngredientCatalogUpdatedAt,
  replaceIngredientCatalog,
  searchIngredients,
} from '@/db/ingredients';
import { initializeDatabase } from '@/db/initialize';
import { addToPantry, getPantryItems, pantryItemId, removeFromPantry } from '@/db/pantry';
import type { CatalogIngredient } from '@/types/pantry';

let db: ReturnType<typeof createTestDatabase>;

beforeEach(async () => {
  db = createTestDatabase();
  await initializeDatabase(db);
});

afterEach(() => {
  db.close();
});

const names = async () => (await getPantryItems(db)).map((item) => item.name);

describe('ingredient catalog', () => {
  const catalog: CatalogIngredient[] = [
    { name: 'Garlic', type: 'Vegetable' },
    { name: 'Garlic Clove', type: 'Vegetable' },
    { name: 'Cigars', type: null },
    { name: 'Granulated Sugar', type: null },
    { name: 'Salt', type: 'Seasoning' },
    { name: '100% Cocoa', type: null },
  ];

  it('is empty and has no update time until downloaded', async () => {
    await expect(getIngredientCatalogUpdatedAt(db)).resolves.toBeNull();
    await expect(searchIngredients(db, 'gar')).resolves.toEqual([]);
  });

  it('stores the list and when it was downloaded', async () => {
    const now = new Date('2026-11-10T12:00:00.000Z');

    await replaceIngredientCatalog(db, catalog, now);

    await expect(getIngredientCatalogUpdatedAt(db)).resolves.toEqual(now);
  });

  it('replaces the previous list', async () => {
    await replaceIngredientCatalog(db, catalog);
    await replaceIngredientCatalog(db, [{ name: 'Basil', type: null }]);

    await expect(searchIngredients(db, 'garlic')).resolves.toEqual([]);
    await expect(searchIngredients(db, 'basil')).resolves.toEqual([{ name: 'Basil', type: null }]);
  });

  it('stores lists larger than one insert batch', async () => {
    const many = Array.from({ length: 450 }, (_, index) => ({ name: `Item ${index}`, type: null }));

    await replaceIngredientCatalog(db, many);

    await expect(searchIngredients(db, 'Item 449')).resolves.toEqual([{ name: 'Item 449', type: null }]);
  });

  it('suggests names starting with the query first, ignoring case', async () => {
    await replaceIngredientCatalog(db, catalog);

    const results = await searchIngredients(db, 'GAR');

    expect(results.map((ingredient) => ingredient.name)).toEqual([
      'Garlic',
      'Garlic Clove',
      'Cigars',
      'Granulated Sugar',
    ]);
  });

  it('limits the number of suggestions', async () => {
    await replaceIngredientCatalog(db, catalog);

    await expect(searchIngredients(db, 'gar', 2)).resolves.toHaveLength(2);
  });

  it('treats % and _ in the query as plain text', async () => {
    await replaceIngredientCatalog(db, catalog);

    await expect(searchIngredients(db, '%')).resolves.toEqual([{ name: '100% Cocoa', type: null }]);
    await expect(searchIngredients(db, '_')).resolves.toEqual([]);
  });

  it('returns nothing for a blank query', async () => {
    await replaceIngredientCatalog(db, catalog);

    await expect(searchIngredients(db, '  ')).resolves.toEqual([]);
  });
});

describe('pantry', () => {
  it('lists items alphabetically, ignoring case', async () => {
    await addToPantry(db, 'salt');
    await addToPantry(db, 'Butter');
    await addToPantry(db, 'Garlic');

    await expect(names()).resolves.toEqual(['Butter', 'Garlic', 'salt']);
  });

  it('ignores adding an ingredient that is already there, in any letter case', async () => {
    await addToPantry(db, 'Garlic');

    await addToPantry(db, 'garlic');

    await expect(names()).resolves.toEqual(['Garlic']);
  });

  it('uses an id derived from the name, so devices agree on it', async () => {
    await addToPantry(db, 'Garlic');

    const [item] = await getPantryItems(db);

    expect(item.id).toBe(await pantryItemId('garlic'));
  });

  it('removes an item but keeps it as a soft-deleted row', async () => {
    await addToPantry(db, 'Garlic');
    const [item] = await getPantryItems(db);

    await removeFromPantry(db, item.id, new Date('2026-11-10T12:00:00.000Z'));

    await expect(names()).resolves.toEqual([]);
    const row = await db.getFirstAsync<{ deleted_at: string | null }>(
      'SELECT deleted_at FROM pantry_items WHERE id = ?',
      item.id
    );
    expect(row?.deleted_at).toBe('2026-11-10T12:00:00.000Z');
  });

  it('restores the same row when a removed ingredient is added again', async () => {
    await addToPantry(db, 'Garlic', new Date('2026-11-01T00:00:00.000Z'));
    const [item] = await getPantryItems(db);
    await removeFromPantry(db, item.id);

    await addToPantry(db, 'Garlic', new Date('2026-11-10T00:00:00.000Z'));

    const rows = await db.getAllAsync<{ id: string; created_at: string; updated_at: string; deleted_at: string | null }>(
      'SELECT id, created_at, updated_at, deleted_at FROM pantry_items'
    );
    expect(rows).toEqual([
      {
        id: item.id,
        created_at: '2026-11-01T00:00:00.000Z',
        updated_at: '2026-11-10T00:00:00.000Z',
        deleted_at: null,
      },
    ]);
  });

  it('rejects a blank name', async () => {
    await expect(addToPantry(db, '  ')).rejects.toThrow(/required/);
  });
});
