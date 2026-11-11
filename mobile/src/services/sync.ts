import type { Database } from '@/db/types';
import {
  acceptServerDelete,
  applyPulledRows,
  getCursor,
  getRowsToPush,
  markPushed,
  type PendingRow,
} from '@/repositories/sync';
import type { ApiClient } from '@/services/api-client';
import type { PullResponse, PulledRow, PushResponse, SyncChanges, SyncTableName } from '@/types/sync';
import { SyncTableNames } from '@/types/sync';

const PushBatchSize = 500;
/** Stops a push loop if rows keep changing while they're uploaded; the rest goes next time. */
const MaxPushBatches = 10;
const PullPageSize = 500;

export type SyncResult = {
  pushed: number;
  /** Rows from other devices saved here. Screens reload when this is above 0. */
  pulled: number;
};

/**
 * Brings this device and the server in step: first uploads this device's changes, then downloads
 * everyone else's. Throws `NetworkError` when offline; nothing is lost, it simply runs again later.
 */
export async function syncNow(db: Database, client: ApiClient): Promise<SyncResult> {
  const pushed = await pushChanges(db, client);
  const pulled = await pullChanges(db, client);
  return { pushed, pulled };
}

async function pushChanges(db: Database, client: ApiClient): Promise<number> {
  let pushed = 0;
  for (let batch = 0; batch < MaxPushBatches; batch++) {
    const pending = await getRowsToPush(db, PushBatchSize);
    if (pending.length === 0) {
      break;
    }
    const response = await client.request<PushResponse>('/v1/changes', {
      method: 'POST',
      body: { changes: groupByTable(pending) },
    });
    await recordPushResult(db, pending, response);
    pushed += response.applied;
  }
  return pushed;
}

function groupByTable(pending: PendingRow[]): SyncChanges<PendingRow['row']> {
  const changes: SyncChanges<PendingRow['row']> = {};
  for (const { table, row } of pending) {
    (changes[table] ??= []).push(row);
  }
  return changes;
}

async function recordPushResult(db: Database, pending: PendingRow[], response: PushResponse): Promise<void> {
  const rejected = new Set(response.rejected.map(({ table, id }) => rejectionKey(table, id)));
  await db.withTransactionAsync(async () => {
    for (const row of pending) {
      if (rejected.has(rejectionKey(row.table, row.row.id))) {
        await acceptServerDelete(db, row.table, row.row.id);
      } else {
        await markPushed(db, row);
      }
    }
  });
}

function rejectionKey(table: SyncTableName, id: string): string {
  return `${table}/${id}`;
}

/** Downloads every page of changes, then saves them all at once together with the new cursor. */
async function pullChanges(db: Database, client: ApiClient): Promise<number> {
  let cursor = await getCursor(db);
  const changes: Record<SyncTableName, PulledRow[]> = {
    recipes: [],
    recipeIngredients: [],
    mealPlanEntries: [],
    shoppingLists: [],
    shoppingListItems: [],
    pantryItems: [],
  };
  let received = 0;
  for (let hasMore = true; hasMore; ) {
    const page = await client.request<PullResponse>(`/v1/changes?since=${cursor}&limit=${PullPageSize}`);
    for (const name of SyncTableNames) {
      const rows = page.changes[name] ?? [];
      changes[name].push(...rows);
      received += rows.length;
    }
    cursor = page.cursor;
    hasMore = page.hasMore;
  }
  if (received === 0) {
    return 0;
  }
  return applyPulledRows(db, changes, cursor);
}
