import type { Database } from '../db/database.ts';

/** Throws if the database can't be reached. */
export async function pingDatabase(db: Database): Promise<void> {
  await db.query('SELECT 1');
}
