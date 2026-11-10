import { createTestDatabase } from '../../jest/node-sqlite-database';

import { initializeDatabase } from '@/db/initialize';
import { addToPlan, getPlan, getPlannedDates, planRecipe, removeFromPlan } from '@/db/meal-plan';
import { isRecipeSaved, removeRecipe, saveRecipe } from '@/db/recipes';
import type { Recipe } from '@/types/recipe';

const recipe = (id: string, name: string): Recipe => ({
  id,
  name,
  category: 'Chicken',
  area: 'Indian',
  instructions: null,
  thumbnailUrl: `https://example.com/${id}.jpg`,
  youtubeUrl: null,
  sourceUrl: null,
  ingredients: [],
});

const curry = recipe('1', 'Chicken Curry');
const pasta = recipe('2', 'Pasta');

let db: ReturnType<typeof createTestDatabase>;

beforeEach(async () => {
  db = createTestDatabase();
  await initializeDatabase(db);
  await saveRecipe(db, curry);
  await saveRecipe(db, pasta);
});

afterEach(() => {
  db.close();
});

const names = async (start: string, end: string) =>
  (await getPlan(db, start, end)).map((entry) => `${entry.date} ${entry.recipe.name}`);

describe('addToPlan and getPlan', () => {
  it('returns planned dinners with recipe details', async () => {
    const id = await addToPlan(db, curry.id, '2026-11-10');

    await expect(getPlan(db, '2026-11-09', '2026-11-15')).resolves.toEqual([
      {
        id,
        date: '2026-11-10',
        recipe: {
          id: curry.id,
          name: curry.name,
          category: curry.category,
          area: curry.area,
          thumbnailUrl: curry.thumbnailUrl,
        },
      },
    ]);
  });

  it('only returns days inside the range, including both ends', async () => {
    await addToPlan(db, curry.id, '2026-11-08');
    await addToPlan(db, curry.id, '2026-11-09');
    await addToPlan(db, pasta.id, '2026-11-15');
    await addToPlan(db, pasta.id, '2026-11-16');

    await expect(names('2026-11-09', '2026-11-15')).resolves.toEqual([
      '2026-11-09 Chicken Curry',
      '2026-11-15 Pasta',
    ]);
  });

  it('allows several dinners on one day, in the order they were added', async () => {
    await addToPlan(db, pasta.id, '2026-11-10', new Date('2026-11-01T10:00:00Z'));
    await addToPlan(db, curry.id, '2026-11-10', new Date('2026-11-01T11:00:00Z'));

    await expect(names('2026-11-10', '2026-11-10')).resolves.toEqual([
      '2026-11-10 Pasta',
      '2026-11-10 Chicken Curry',
    ]);
  });

  it('requires the recipe to be saved first', async () => {
    await expect(addToPlan(db, 'not-saved', '2026-11-10')).rejects.toThrow(/FOREIGN KEY/);
  });

  it('keeps a planned dinner when its recipe is removed from saved recipes', async () => {
    await addToPlan(db, curry.id, '2026-11-10');

    await removeRecipe(db, curry.id);

    await expect(names('2026-11-10', '2026-11-10')).resolves.toEqual(['2026-11-10 Chicken Curry']);
  });
});

describe('planRecipe', () => {
  it('saves an unsaved recipe, then plans it', async () => {
    const soup = recipe('3', 'Soup');

    await planRecipe(db, soup, '2026-11-10');

    await expect(isRecipeSaved(db, soup.id)).resolves.toBe(true);
    await expect(names('2026-11-10', '2026-11-10')).resolves.toEqual(['2026-11-10 Soup']);
  });

  it('plans an already saved recipe without changing it', async () => {
    await planRecipe(db, { ...curry, name: 'Renamed' }, '2026-11-10');

    await expect(names('2026-11-10', '2026-11-10')).resolves.toEqual(['2026-11-10 Chicken Curry']);
  });
});

describe('removeFromPlan', () => {
  it('removes only that entry and keeps it as a soft-deleted row', async () => {
    const first = await addToPlan(db, curry.id, '2026-11-10');
    await addToPlan(db, curry.id, '2026-11-11');

    await removeFromPlan(db, first, new Date('2026-11-10T12:00:00Z'));

    await expect(names('2026-11-09', '2026-11-15')).resolves.toEqual(['2026-11-11 Chicken Curry']);
    const row = await db.getFirstAsync<{ deleted_at: string | null }>(
      'SELECT deleted_at FROM meal_plan_entries WHERE id = ?',
      first
    );
    expect(row?.deleted_at).toBe('2026-11-10T12:00:00.000Z');
  });
});

describe('getPlannedDates', () => {
  it('lists upcoming dates for a recipe once each, in order', async () => {
    await addToPlan(db, curry.id, '2026-11-14');
    await addToPlan(db, curry.id, '2026-11-11');
    await addToPlan(db, curry.id, '2026-11-11');
    await addToPlan(db, curry.id, '2026-11-01');
    await addToPlan(db, pasta.id, '2026-11-12');

    await expect(getPlannedDates(db, curry.id, '2026-11-10')).resolves.toEqual([
      '2026-11-11',
      '2026-11-14',
    ]);
  });

  it('ignores removed entries', async () => {
    const id = await addToPlan(db, curry.id, '2026-11-11');
    await removeFromPlan(db, id);

    await expect(getPlannedDates(db, curry.id, '2026-11-10')).resolves.toEqual([]);
  });
});
