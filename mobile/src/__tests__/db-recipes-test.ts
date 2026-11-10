import { createTestDatabase } from '../../jest/node-sqlite-database';

import { initializeDatabase } from '@/db/initialize';
import {
  getSavedRecipe,
  getSavedRecipes,
  isRecipeSaved,
  removeRecipe,
  saveRecipe,
} from '@/db/recipes';
import type { Recipe } from '@/types/recipe';

const pasta: Recipe = {
  id: '52771',
  name: 'Spicy Arrabiata Penne',
  category: 'Vegetarian',
  area: 'Italian',
  instructions: 'Boil the pasta.',
  thumbnailUrl: 'https://example.com/pasta.jpg',
  youtubeUrl: null,
  sourceUrl: null,
  ingredients: [
    { name: 'penne rigate', measure: '1 pound' },
    { name: 'garlic', measure: '3 cloves' },
    { name: 'basil', measure: '' },
  ],
};

const curry: Recipe = {
  ...pasta,
  id: '52772',
  name: 'Chicken Curry',
  category: 'Chicken',
  ingredients: [{ name: 'chicken', measure: '500g' }],
};

const monday = new Date('2026-11-09T18:00:00.000Z');
const tuesday = new Date('2026-11-10T18:00:00.000Z');
const wednesday = new Date('2026-11-11T18:00:00.000Z');

let db: ReturnType<typeof createTestDatabase>;

beforeEach(async () => {
  db = createTestDatabase();
  await initializeDatabase(db);
});

afterEach(() => {
  db.close();
});

describe('saveRecipe', () => {
  it('stores the recipe with its ingredients in order', async () => {
    await saveRecipe(db, pasta);

    await expect(getSavedRecipe(db, pasta.id)).resolves.toEqual(pasta);
  });

  it('refreshes the copy and its ingredients when saved again', async () => {
    await saveRecipe(db, pasta, monday);
    const updated: Recipe = {
      ...pasta,
      name: 'Arrabiata',
      ingredients: [{ name: 'spaghetti', measure: '400g' }],
    };

    await saveRecipe(db, updated, tuesday);

    await expect(getSavedRecipe(db, pasta.id)).resolves.toEqual(updated);
  });

  it('keeps replaced ingredients as soft-deleted rows for sync', async () => {
    await saveRecipe(db, pasta, monday);
    await saveRecipe(db, { ...pasta, ingredients: [] }, tuesday);

    const rows = await db.getAllAsync<{ deleted_at: string | null }>(
      'SELECT deleted_at FROM recipe_ingredients WHERE recipe_id = ?',
      pasta.id
    );
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.deleted_at === tuesday.toISOString())).toBe(true);
  });

  it('restores a removed recipe and keeps its original created_at', async () => {
    await saveRecipe(db, pasta, monday);
    await removeRecipe(db, pasta.id, tuesday);

    await saveRecipe(db, pasta, wednesday);

    await expect(isRecipeSaved(db, pasta.id)).resolves.toBe(true);
    const row = await db.getFirstAsync<{ created_at: string; updated_at: string }>(
      'SELECT created_at, updated_at FROM recipes WHERE id = ?',
      pasta.id
    );
    expect(row).toEqual({
      created_at: monday.toISOString(),
      updated_at: wednesday.toISOString(),
    });
  });
});

describe('removeRecipe', () => {
  it('hides the recipe but keeps the row', async () => {
    await saveRecipe(db, pasta, monday);

    await removeRecipe(db, pasta.id, tuesday);

    await expect(isRecipeSaved(db, pasta.id)).resolves.toBe(false);
    await expect(getSavedRecipe(db, pasta.id)).resolves.toBeNull();
    await expect(getSavedRecipes(db)).resolves.toEqual([]);
    const row = await db.getFirstAsync<{ deleted_at: string | null }>(
      'SELECT deleted_at FROM recipes WHERE id = ?',
      pasta.id
    );
    expect(row?.deleted_at).toBe(tuesday.toISOString());
  });

  it('does nothing for a recipe that is not saved', async () => {
    await expect(removeRecipe(db, 'unknown')).resolves.toBeUndefined();
  });
});

describe('getSavedRecipes', () => {
  it('lists summaries with the most recently saved first', async () => {
    await saveRecipe(db, pasta, monday);
    await saveRecipe(db, curry, tuesday);

    await expect(getSavedRecipes(db)).resolves.toEqual([
      {
        id: curry.id,
        name: curry.name,
        category: curry.category,
        area: curry.area,
        thumbnailUrl: curry.thumbnailUrl,
      },
      {
        id: pasta.id,
        name: pasta.name,
        category: pasta.category,
        area: pasta.area,
        thumbnailUrl: pasta.thumbnailUrl,
      },
    ]);
  });
});

describe('isRecipeSaved', () => {
  it('is false for a recipe that was never saved', async () => {
    await expect(isRecipeSaved(db, pasta.id)).resolves.toBe(false);
  });

  it('is true after saving', async () => {
    await saveRecipe(db, pasta);

    await expect(isRecipeSaved(db, pasta.id)).resolves.toBe(true);
  });
});

describe('SQL safety', () => {
  it('stores names containing quotes as plain text', async () => {
    const tricky: Recipe = { ...pasta, name: "Grandma's \"best\" pie'); DROP TABLE recipes;--" };

    await saveRecipe(db, tricky);

    await expect(getSavedRecipe(db, pasta.id)).resolves.toMatchObject({ name: tricky.name });
  });
});
