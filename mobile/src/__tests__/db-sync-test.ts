import { createTestDatabase } from '../../jest/node-sqlite-database';

import { initializeDatabase } from '@/db/initialize';
import { addToPantry, getPantryItems, removeFromPantry } from '@/repositories/pantry';
import { getSavedRecipe } from '@/repositories/recipes';
import { checkShoppingItem } from '@/repositories/shopping-list';
import {
  acceptServerDelete,
  applyPulledRows,
  getCursor,
  getRowsToPush,
  hasRowsToPush,
  markPushed,
} from '@/repositories/sync';
import type { PulledRow } from '@/types/sync';

let db: ReturnType<typeof createTestDatabase>;

beforeEach(async () => {
  db = createTestDatabase();
  await initializeDatabase(db);
});

afterEach(() => {
  db.close();
});

const serverTime = '2026-11-12T10:00:00.000Z';

function pulled(id: string, changeNumber: number, fields: Record<string, string | number | boolean | null>): PulledRow {
  return { id, ...fields, createdAt: serverTime, updatedAt: serverTime, deletedAt: null, changeNumber };
}

describe('getRowsToPush', () => {
  it('returns changed rows in the API shape, parents first', async () => {
    await checkShoppingItem(db, '2026-11-09', 'Milk');

    const pending = await getRowsToPush(db, 100);

    expect(pending.map((row) => row.table)).toEqual(['shoppingLists', 'shoppingListItems']);
    expect(pending[1]!.row).toEqual({
      id: expect.any(String),
      shoppingListId: pending[0]!.row.id,
      ingredientName: 'Milk',
      measure: '',
      recipeId: null,
      isChecked: true,
      deleted: false,
      baseChangeNumber: null,
    });
  });

  it('sends deletions with the change number the device last pulled', async () => {
    await applyPulledRows(db, { pantryItems: [pulled('salt', 12, { ingredientName: 'Salt' })] }, 12);

    await removeFromPantry(db, 'salt');

    const [pending] = await getRowsToPush(db, 100);
    expect(pending!.row).toMatchObject({ id: 'salt', deleted: true, baseChangeNumber: 12 });
  });
});

describe('markPushed', () => {
  it("clears the mark, but not when the row changed again while it was uploading", async () => {
    await addToPantry(db, 'Salt');
    const [pending] = await getRowsToPush(db, 100);

    await markPushed(db, pending!);
    expect(await hasRowsToPush(db)).toBe(false);

    await addToPantry(db, 'Pepper');
    const [pepper] = await getRowsToPush(db, 100);
    await removeFromPantry(db, pepper!.row.id, new Date(Date.now() + 1000));
    await markPushed(db, pepper!);
    expect(await hasRowsToPush(db)).toBe(true);
  });
});

describe('applyPulledRows', () => {
  it('saves new rows without marking them for upload, and keeps the cursor', async () => {
    const applied = await applyPulledRows(
      db,
      { pantryItems: [pulled('garlic', 5, { ingredientName: 'Garlic' })] },
      5
    );

    expect(applied).toBe(1);
    expect(await getPantryItems(db)).toEqual([{ id: 'garlic', name: 'Garlic' }]);
    expect(await hasRowsToPush(db)).toBe(false);
    expect(await getCursor(db)).toBe(5);
  });

  it('accepts children before their parents, as pages can deliver them', async () => {
    await applyPulledRows(
      db,
      {
        recipeIngredients: [
          pulled('ing-1', 3, { recipeId: '52772', position: 1, ingredientName: 'Soy sauce', measure: '3/4 cup' }),
        ],
        recipes: [
          pulled('52772', 9, {
            name: 'Teriyaki Chicken',
            category: null,
            area: 'Japanese',
            instructions: null,
            thumbnailUrl: null,
            youtubeUrl: null,
            sourceUrl: null,
          }),
        ],
      },
      9
    );

    await expect(getSavedRecipe(db, '52772')).resolves.toMatchObject({
      name: 'Teriyaki Chicken',
      ingredients: [{ name: 'Soy sauce', measure: '3/4 cup' }],
    });
  });

  it('applies deletions from other devices', async () => {
    await applyPulledRows(db, { pantryItems: [pulled('salt', 1, { ingredientName: 'Salt' })] }, 1);

    await applyPulledRows(
      db,
      { pantryItems: [{ ...pulled('salt', 2, { ingredientName: 'Salt' }), deletedAt: serverTime }] },
      2
    );

    expect(await getPantryItems(db)).toEqual([]);
    expect(await hasRowsToPush(db)).toBe(false);
  });

  it("doesn't overwrite a local change that hasn't been uploaded yet", async () => {
    await applyPulledRows(db, { pantryItems: [pulled('salt', 1, { ingredientName: 'Salt' })] }, 1);
    await removeFromPantry(db, 'salt');

    const applied = await applyPulledRows(
      db,
      { pantryItems: [pulled('salt', 2, { ingredientName: 'Sea salt' })] },
      2
    );

    expect(applied).toBe(0);
    const [pending] = await getRowsToPush(db, 100);
    expect(pending!.row).toMatchObject({ id: 'salt', ingredientName: 'Salt', deleted: true });
  });

  it('stores true/false as 1/0', async () => {
    await applyPulledRows(
      db,
      {
        shoppingLists: [pulled('list', 1, { name: 'Week', startDate: '2026-11-09', endDate: '2026-11-15' })],
        shoppingListItems: [
          pulled('item', 2, { shoppingListId: 'list', ingredientName: 'Milk', measure: '', recipeId: null, isChecked: true }),
        ],
      },
      2
    );

    const row = await db.getFirstAsync<{ is_checked: number }>("SELECT is_checked FROM shopping_list_items WHERE id = 'item'");
    expect(row?.is_checked).toBe(1);
  });
});

describe('acceptServerDelete', () => {
  it('deletes the row here and stops trying to upload it', async () => {
    await addToPantry(db, 'Milk');
    const [milk] = await getPantryItems(db);

    await acceptServerDelete(db, 'pantryItems', milk!.id);

    expect(await getPantryItems(db)).toEqual([]);
    expect(await hasRowsToPush(db)).toBe(false);
  });
});
