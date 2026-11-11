import type { Database } from '../db/database.ts';
import { pingDatabase } from '../repositories/health.ts';

export type HealthStatus = 'ok' | 'database_unavailable';

/** Whether the API can do its job, which means reaching the database. */
export async function getHealth(db: Database): Promise<HealthStatus> {
  try {
    await pingDatabase(db);
    return 'ok';
  } catch {
    return 'database_unavailable';
  }
}
