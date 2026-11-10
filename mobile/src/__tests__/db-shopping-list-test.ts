import { createTestDatabase } from '../../jest/node-sqlite-database';

import { initializeDatabase } from '@/db/initialize';
import { addToPlan } from '@/db/meal-plan';
import { addToPantry, getPantryItems } from '@/db/pantry';
import { saveRecipe } from '@/db/recipes';
import {
  addShoppingItem,
  checkShoppingItem,
  getPlannedIngredients,
  getStoredShoppingItems,
  markCartBought,
  removeShoppingItem,
  uncheckShoppingItem,
} from '@/db/shopping-list';
import type { Recipe } from '@/types/recipe';

const week = '2026-11-09';
const monday = new Date('2026-11-09T10:00:00.000Z');
const tuesday = new Date('2026-11-10T10:00:00.000Z');

const pasta: Recipe = {
  id: '1',
  name: 'Pasta',
  category: null,
  area: null,
  instructions: null,
  thumbnailUrl: null,
  youtubeUrl: null,
  sourceUrl: null,
  ingredients: [
    { name: 'Penne', measure: '1 pound' },
    { name: 'Garlic', measure: '3 cloves' },
  ],
};

let db: ReturnType<typeof createTestDatabase>;

beforeEach(async () => {
  db = createTestDatabase();
  await initializeDatabase(db);
  await saveRecipe(db, pasta);
});

afterEach(() => {
  db.close();
});

const pantry = async () => (await getPantryItems(db)).map((item) => item.name);

describe('getPlannedIngredients', () => {
  it('returns the ingredients of dinners planned in the week, in order', async () => {
    await addToPlan(db, pasta.id, '2026-11-11');
    await addToPlan(db, pasta.id, '2026-11-20');

    await expect(getPlannedIngredients(db, week, '2026-11-15')).resolves.toEqual([
      { date: '2026-11-11', recipeName: 'Pasta', name: 'Penne', measure: '1 pound' },
      { date: '2026-11-11', recipeName: 'Pasta', name: 'Garlic', measure: '3 cloves' },
    ]);
  });

  it('includes a planned recipe that was removed from saved recipes', async () => {
    await addToPlan(db, pasta.id, '2026-11-11');
    await db.runAsync('UPDATE recipes SET deleted_at = ? WHERE id = ?', monday.toISOString(), pasta.id);

    await expect(getPlannedIngredients(db, week, '2026-11-15')).resolves.toHaveLength(2);
  });
});

describe('ticking off', () => {
  it('puts the line in the cart without touching the pantry', async () => {
    await checkShoppingItem(db, week, 'Garlic', monday);

    await expect(getStoredShoppingItems(db, week)).resolves.toEqual([{ name: 'Garlic', isChecked: true }]);
    await expect(pantry()).resolves.toEqual([]);
  });

  it('keeps lists of different weeks apart', async () => {
    await checkShoppingItem(db, week, 'Garlic', monday);

    await expect(getStoredShoppingItems(db, '2026-11-16')).resolves.toEqual([]);
  });

  it('unticking a planned line removes its row, so the plan brings it back', async () => {
    await checkShoppingItem(db, week, 'Garlic', monday);

    await uncheckShoppingItem(db, week, 'garlic', { isPlanned: true }, tuesday);

    await expect(getStoredShoppingItems(db, week)).resolves.toEqual([]);
  });

  it('unticking a line added by hand keeps it on the list, unticked', async () => {
    await addShoppingItem(db, week, 'Milk', monday);
    await checkShoppingItem(db, week, 'Milk', monday);

    await uncheckShoppingItem(db, week, 'Milk', { isPlanned: false }, tuesday);

    await expect(getStoredShoppingItems(db, week)).resolves.toEqual([{ name: 'Milk', isChecked: false }]);
  });

  it('can tick the same line again after unticking it', async () => {
    await checkShoppingItem(db, week, 'Garlic', monday);
    await uncheckShoppingItem(db, week, 'Garlic', { isPlanned: true }, tuesday);

    await checkShoppingItem(db, week, 'Garlic', tuesday);

    await expect(getStoredShoppingItems(db, week)).resolves.toEqual([{ name: 'Garlic', isChecked: true }]);
  });
});

describe('markCartBought', () => {
  it('puts everything in the cart into the pantry and empties the cart', async () => {
    await checkShoppingItem(db, week, 'Garlic', monday);
    await checkShoppingItem(db, week, 'Penne', monday);

    await markCartBought(db, week, tuesday);

    await expect(pantry()).resolves.toEqual(['Garlic', 'Penne']);
    await expect(getStoredShoppingItems(db, week)).resolves.toEqual([]);
  });

  it('leaves unticked lines on the list and out of the pantry', async () => {
    await addShoppingItem(db, week, 'Milk', monday);
    await checkShoppingItem(db, week, 'Garlic', monday);

    await markCartBought(db, week, tuesday);

    await expect(pantry()).resolves.toEqual(['Garlic']);
    await expect(getStoredShoppingItems(db, week)).resolves.toEqual([{ name: 'Milk', isChecked: false }]);
  });

  it('keeps an ingredient that was already in the pantry', async () => {
    await addToPantry(db, 'Garlic', monday);
    await addShoppingItem(db, week, 'Garlic', monday);
    await checkShoppingItem(db, week, 'Garlic', monday);

    await markCartBought(db, week, tuesday);

    await expect(pantry()).resolves.toEqual(['Garlic']);
  });

  it('only empties the cart of the given week', async () => {
    await checkShoppingItem(db, week, 'Garlic', monday);
    await checkShoppingItem(db, '2026-11-16', 'Penne', monday);

    await markCartBought(db, week, tuesday);

    await expect(getStoredShoppingItems(db, '2026-11-16')).resolves.toEqual([{ name: 'Penne', isChecked: true }]);
  });

  it('does nothing when the cart is empty', async () => {
    await markCartBought(db, week, tuesday);

    await expect(pantry()).resolves.toEqual([]);
  });
});

describe('lines added by hand', () => {
  it('adds a line once, ignoring case', async () => {
    await addShoppingItem(db, week, 'Milk', monday);
    await addShoppingItem(db, week, 'milk', tuesday);

    await expect(getStoredShoppingItems(db, week)).resolves.toEqual([{ name: 'Milk', isChecked: false }]);
  });

  it('does not untick a ticked line when added again', async () => {
    await checkShoppingItem(db, week, 'Milk', monday);

    await addShoppingItem(db, week, 'Milk', tuesday);

    await expect(getStoredShoppingItems(db, week)).resolves.toEqual([{ name: 'Milk', isChecked: true }]);
  });

  it('removes a line and can add it back', async () => {
    await addShoppingItem(db, week, 'Milk', monday);
    await removeShoppingItem(db, week, 'Milk', tuesday);
    await expect(getStoredShoppingItems(db, week)).resolves.toEqual([]);

    await addShoppingItem(db, week, 'Milk', tuesday);

    await expect(getStoredShoppingItems(db, week)).resolves.toEqual([{ name: 'Milk', isChecked: false }]);
    const rows = await db.getAllAsync<{ id: string }>('SELECT id FROM shopping_list_items');
    expect(rows).toHaveLength(1);
  });
});
