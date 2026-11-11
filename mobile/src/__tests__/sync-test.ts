import { createTestDatabase } from '../../jest/node-sqlite-database';

import { initializeDatabase } from '@/db/initialize';
import { clearHouseholdData } from '@/repositories/local-data';
import { addToPantry, getPantryItems } from '@/repositories/pantry';
import { getCursor, hasRowsToPush } from '@/repositories/sync';
import { NetworkError, type ApiClient } from '@/services/api-client';
import { syncNow } from '@/services/sync';
import type { PullResponse, PushResponse } from '@/types/sync';

let db: ReturnType<typeof createTestDatabase>;

beforeEach(async () => {
  db = createTestDatabase();
  await initializeDatabase(db);
});

afterEach(() => {
  db.close();
});

type Request = { method: string; path: string; body?: unknown };

/** A fake API: answers pushes with `push` and pulls with the pages in order. */
function fakeServer(options: { push?: (body: unknown) => PushResponse; pages?: PullResponse[] }) {
  const requests: Request[] = [];
  const pages = [...(options.pages ?? [])];
  const client: ApiClient = {
    request: async <T,>(path: string, request: { method?: string; body?: unknown } = {}) => {
      const method = request.method ?? 'GET';
      requests.push({ method, path, body: request.body });
      if (method === 'POST') {
        return (options.push?.(request.body) ?? { applied: 0, rejected: [] }) as T;
      }
      return (pages.shift() ?? { cursor: 0, hasMore: false, changes: {} }) as T;
    },
  };
  return { client, requests };
}

const page = (cursor: number, hasMore: boolean, pantryItems: PullResponse['changes']['pantryItems']): PullResponse => ({
  cursor,
  hasMore,
  changes: { pantryItems },
});

const pantryRow = (id: string, ingredientName: string, changeNumber: number) => ({
  id,
  ingredientName,
  createdAt: '2026-11-12T10:00:00.000Z',
  updatedAt: '2026-11-12T10:00:00.000Z',
  deletedAt: null,
  changeNumber,
});

describe('syncNow', () => {
  it('uploads local changes first, then downloads', async () => {
    await addToPantry(db, 'Salt');
    const { client, requests } = fakeServer({ push: () => ({ applied: 1, rejected: [] }) });

    await expect(syncNow(db, client, 'household-1')).resolves.toEqual({ pushed: 1, pulled: 0, switchedHousehold: false });

    expect(requests.map(({ method, path }) => `${method} ${path}`)).toEqual([
      'POST /v1/changes',
      'GET /v1/changes?since=0&limit=500',
    ]);
    expect(requests[0]!.body).toEqual({
      changes: { pantryItems: [expect.objectContaining({ ingredientName: 'Salt', deleted: false })] },
    });
    expect(await hasRowsToPush(db)).toBe(false);
  });

  it('downloads every page and remembers where it got to', async () => {
    const { client, requests } = fakeServer({
      pages: [page(7, true, [pantryRow('garlic', 'Garlic', 7)]), page(9, false, [pantryRow('onion', 'Onion', 9)])],
    });

    await expect(syncNow(db, client, 'household-1')).resolves.toEqual({ pushed: 0, pulled: 2, switchedHousehold: false });

    expect(requests.map(({ path }) => path)).toEqual([
      '/v1/changes?since=0&limit=500',
      '/v1/changes?since=7&limit=500',
    ]);
    expect((await getPantryItems(db)).map((item) => item.name)).toEqual(['Garlic', 'Onion']);
    expect(await getCursor(db)).toBe(9);
  });

  it('deletes a row here when the server says someone deleted it first', async () => {
    await addToPantry(db, 'Milk');
    const [milk] = await getPantryItems(db);
    const { client } = fakeServer({
      push: () => ({ applied: 0, rejected: [{ table: 'pantryItems', id: milk!.id, reason: 'deleted_on_server' }] }),
    });

    await syncNow(db, client, 'household-1');

    expect(await getPantryItems(db)).toEqual([]);
    expect(await hasRowsToPush(db)).toBe(false);
  });

  it('uploads data from before login to the first household', async () => {
    await addToPantry(db, 'Salt');
    const { client, requests } = fakeServer({ push: () => ({ applied: 1, rejected: [] }) });

    const result = await syncNow(db, client, 'household-1');

    expect(result.switchedHousehold).toBe(false);
    expect(requests[0]!.method).toBe('POST');
  });

  it("replaces another household's data instead of uploading it", async () => {
    const { client } = fakeServer({ push: () => ({ applied: 1, rejected: [] }) });
    await syncNow(db, client, 'old-household');
    await addToPantry(db, 'Salt');

    const { client: newClient, requests } = fakeServer({ pages: [page(3, false, [pantryRow('garlic', 'Garlic', 3)])] });
    const result = await syncNow(db, newClient, 'new-household');

    expect(result.switchedHousehold).toBe(true);
    expect(requests.map(({ method }) => method)).toEqual(['GET']);
    expect((await getPantryItems(db)).map((item) => item.name)).toEqual(['Garlic']);
    expect(await getCursor(db)).toBe(3);
  });

  it('never uploads data that appears after signing out', async () => {
    await clearHouseholdData(db);
    // e.g. written by a sync that was still running when the user signed out.
    await addToPantry(db, 'Salt');
    const { client, requests } = fakeServer({});

    await syncNow(db, client, 'next-users-household');

    expect(requests.map(({ method }) => method)).toEqual(['GET']);
    expect(await getPantryItems(db)).toEqual([]);
  });

  it('keeps local changes for later when offline', async () => {
    await addToPantry(db, 'Salt');
    const client: ApiClient = {
      request: async () => {
        throw new NetworkError();
      },
    };

    await expect(syncNow(db, client, 'household-1')).rejects.toBeInstanceOf(NetworkError);

    expect(await hasRowsToPush(db)).toBe(true);
  });
});
