import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { DatabasePool } from '../src/db/database.ts';
import type { SignedInUser } from '../src/services/auth.ts';
import type { PullResponse, PushResponse } from '../src/types/sync.ts';
import { bearer, join, signUp, type TestApp } from './helpers/accounts.ts';
import { buildTestApp } from './helpers/test-app.ts';
import { createTestDatabase } from './helpers/test-database.ts';

let pool: DatabasePool;
let app: TestApp;

beforeAll(async () => {
  pool = await createTestDatabase();
  app = await buildTestApp(pool);
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

async function pull(user: SignedInUser, query: { since?: number; limit?: number } = {}): Promise<PullResponse> {
  const response = await app.inject({
    method: 'GET',
    url: '/v1/changes',
    headers: bearer(user.accessToken),
    query: Object.fromEntries(Object.entries(query).map(([key, value]) => [key, String(value)])),
  });
  expect(response.statusCode).toBe(200);
  return response.json();
}

function pushRequest(user: SignedInUser, changes: object) {
  return app.inject({
    method: 'POST',
    url: '/v1/changes',
    headers: bearer(user.accessToken),
    payload: { changes },
  });
}

async function push(user: SignedInUser, changes: object): Promise<PushResponse> {
  const response = await pushRequest(user, changes);
  expect(response.statusCode, response.body).toBe(200);
  return response.json();
}

function pantryItem(id: string, ingredientName: string, sync: { deleted?: boolean; baseChangeNumber?: number | null } = {}) {
  return { id, ingredientName, deleted: sync.deleted ?? false, baseChangeNumber: sync.baseChangeNumber ?? null };
}

/** The server's current version of one pantry item, as a pull from the start shows it. */
async function serverPantryItem(user: SignedInUser, id: string) {
  const item = (await pull(user)).changes.pantryItems.find((row) => row.id === id);
  if (!item) {
    throw new Error(`Pantry item ${id} not found`);
  }
  return item;
}

describe('GET /v1/changes', () => {
  it('returns nothing for a new household', async () => {
    const anna = await signUp(app);

    expect(await pull(anna)).toEqual({
      cursor: 0,
      hasMore: false,
      changes: {
        recipes: [],
        recipeIngredients: [],
        mealPlanEntries: [],
        shoppingLists: [],
        shoppingListItems: [],
        pantryItems: [],
      },
    });
  });

  it('pages through changes with the cursor', async () => {
    const anna = await signUp(app);
    const names = ['Salt', 'Pepper', 'Garlic', 'Onion', 'Butter'];
    await push(anna, { pantryItems: names.map((name) => pantryItem(randomUUID(), name)) });

    const pulled: string[] = [];
    let since = 0;
    let pages = 0;
    for (let hasMore = true; hasMore; pages++) {
      const page = await pull(anna, { since, limit: 2 });
      pulled.push(...page.changes.pantryItems.map((row) => row.ingredientName));
      since = page.cursor;
      hasMore = page.hasMore;
    }

    expect(pages).toBe(3);
    expect(pulled).toEqual(names);
    expect((await pull(anna, { since })).changes.pantryItems).toEqual([]);
  });

  it("never shows another household's rows", async () => {
    const anna = await signUp(app);
    const stranger = await signUp(app);
    await push(anna, { pantryItems: [pantryItem(randomUUID(), 'Salt')] });

    expect((await pull(stranger)).changes.pantryItems).toEqual([]);
  });

  it('needs a login', async () => {
    expect((await app.inject({ method: 'GET', url: '/v1/changes' })).statusCode).toBe(401);
  });
});

describe('POST /v1/changes', () => {
  it('saves rows of every table, with timestamps and change numbers set by the server', async () => {
    const anna = await signUp(app);
    const listId = randomUUID();

    const result = await push(anna, {
      // Children come before parents here on purpose: the server applies parents first.
      mealPlanEntries: [
        { id: randomUUID(), date: '2026-11-14', recipeId: '52772', deleted: false, baseChangeNumber: null },
      ],
      recipeIngredients: [
        {
          id: randomUUID(),
          recipeId: '52772',
          position: 0,
          ingredientName: 'Soy sauce',
          measure: '3/4 cup',
          deleted: false,
          baseChangeNumber: null,
        },
      ],
      recipes: [
        {
          id: '52772',
          name: 'Teriyaki Chicken Casserole',
          category: 'Chicken',
          area: 'Japanese',
          instructions: 'Preheat oven to 350° F.',
          thumbnailUrl: null,
          youtubeUrl: null,
          sourceUrl: null,
          deleted: false,
          baseChangeNumber: null,
        },
      ],
      shoppingListItems: [
        {
          id: randomUUID(),
          shoppingListId: listId,
          ingredientName: 'Milk',
          measure: '',
          recipeId: null,
          isChecked: true,
          deleted: false,
          baseChangeNumber: null,
        },
      ],
      shoppingLists: [
        { id: listId, name: 'Week of 9 Nov', startDate: '2026-11-09', endDate: '2026-11-15', deleted: false, baseChangeNumber: null },
      ],
      pantryItems: [pantryItem(randomUUID(), 'Salt')],
    });

    expect(result).toEqual({ applied: 6, rejected: [] });
    const { changes, cursor } = await pull(anna);
    expect(changes.recipes[0]).toMatchObject({ id: '52772', area: 'Japanese', deletedAt: null });
    expect(changes.mealPlanEntries[0]!.date).toBe('2026-11-14');
    expect(changes.shoppingLists[0]).toMatchObject({ startDate: '2026-11-09', endDate: '2026-11-15' });
    expect(changes.shoppingListItems[0]).toMatchObject({ isChecked: true, recipeId: null });
    const salt = changes.pantryItems[0]!;
    expect(Date.now() - Date.parse(salt.updatedAt)).toBeLessThan(60_000);
    expect(cursor).toBe(Math.max(...Object.values(changes).flat().map((row) => row.changeNumber)));
  });

  it('keeps the last write to a row', async () => {
    const { anna, ben } = await family();
    const id = randomUUID();
    await push(anna, { pantryItems: [pantryItem(id, 'garlic')] });
    const base = (await serverPantryItem(anna, id)).changeNumber;

    await push(anna, { pantryItems: [pantryItem(id, 'Garlic, Anna', { baseChangeNumber: base })] });
    await push(ben, { pantryItems: [pantryItem(id, 'Garlic, Ben', { baseChangeNumber: base })] });

    expect((await serverPantryItem(anna, id)).ingredientName).toBe('Garlic, Ben');
  });

  it("lets a delete beat an edit from a device that hadn't seen the delete", async () => {
    const { anna, ben } = await family();
    const id = randomUUID();
    await push(anna, { pantryItems: [pantryItem(id, 'Milk')] });
    const seenByBen = (await serverPantryItem(ben, id)).changeNumber;

    await push(anna, { pantryItems: [pantryItem(id, 'Milk', { deleted: true, baseChangeNumber: seenByBen })] });
    const result = await push(ben, { pantryItems: [pantryItem(id, 'Oat milk', { baseChangeNumber: seenByBen })] });

    expect(result).toEqual({
      applied: 0,
      rejected: [{ table: 'pantryItems', id, reason: 'deleted_on_server' }],
    });
    const stored = await serverPantryItem(anna, id);
    expect(stored.deletedAt).not.toBeNull();
    expect(stored.ingredientName).toBe('Milk');
  });

  it('restores a deleted row when the device had seen the delete', async () => {
    const anna = await signUp(app);
    const id = randomUUID();
    await push(anna, { pantryItems: [pantryItem(id, 'Garlic')] });
    await push(anna, { pantryItems: [pantryItem(id, 'Garlic', { deleted: true, baseChangeNumber: null })] });
    const deletedVersion = await serverPantryItem(anna, id);

    const result = await push(anna, {
      pantryItems: [pantryItem(id, 'Garlic', { baseChangeNumber: deletedVersion.changeNumber })],
    });

    expect(result.applied).toBe(1);
    const restored = await serverPantryItem(anna, id);
    expect(restored.deletedAt).toBeNull();
    expect(restored.changeNumber).toBeGreaterThan(deletedVersion.changeNumber);
  });

  it('merges the same name-based row created on two devices into one', async () => {
    const { anna, ben } = await family();
    const garlicId = randomUUID();

    await push(anna, { pantryItems: [pantryItem(garlicId, 'Garlic')] });
    await push(ben, { pantryItems: [pantryItem(garlicId, 'Garlic')] });

    expect((await pull(anna)).changes.pantryItems.filter((row) => row.id === garlicId)).toHaveLength(1);
  });

  it('keeps households apart even when they use the same id', async () => {
    const anna = await signUp(app);
    const stranger = await signUp(app);
    const sharedId = randomUUID();
    await push(anna, { pantryItems: [pantryItem(sharedId, 'Salt')] });

    await push(stranger, { pantryItems: [pantryItem(sharedId, 'Sugar', { deleted: false })] });

    expect((await serverPantryItem(anna, sharedId)).ingredientName).toBe('Salt');
    expect((await serverPantryItem(stranger, sharedId)).ingredientName).toBe('Sugar');
  });

  it('saves nothing when one row points to something that does not exist', async () => {
    const anna = await signUp(app);

    const response = await pushRequest(anna, {
      pantryItems: [pantryItem(randomUUID(), 'Salt')],
      mealPlanEntries: [
        { id: randomUUID(), date: '2026-11-14', recipeId: 'no-such-recipe', deleted: false, baseChangeNumber: null },
      ],
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('validation_failed');
    expect((await pull(anna)).changes.pantryItems).toEqual([]);
  });

  it('checks every row against its table', async () => {
    const anna = await signUp(app);

    const response = await pushRequest(anna, {
      mealPlanEntries: [{ id: 'not-a-uuid', date: '14/11/2026', recipeId: '1', deleted: false, baseChangeNumber: null }],
    });

    expect(response.statusCode).toBe(400);
    const paths = response.json().error.details.map((detail: { path: string }) => detail.path);
    expect(paths).toEqual(
      expect.arrayContaining(['body/changes/mealPlanEntries/0/id', 'body/changes/mealPlanEntries/0/date'])
    );
  });

  it('refuses more than 1000 rows in one push', async () => {
    const anna = await signUp(app);
    const rows = Array.from({ length: 1001 }, (_, index) => pantryItem(randomUUID(), `Item ${index}`));

    const response = await pushRequest(anna, { pantryItems: rows });

    expect(response.statusCode).toBe(400);
  });
});

/** Anna and Ben in the same household. */
async function family() {
  const anna = await signUp(app, { name: 'Anna' });
  const ben = await signUp(app, { name: 'Ben' });
  await join(app, anna, ben);
  return { anna, ben };
}
