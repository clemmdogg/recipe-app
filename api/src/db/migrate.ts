import { withTransaction, type DatabasePool } from './database.ts';
import { migrations as allMigrations } from './migrations/index.ts';
import type { Migration } from './migrations/types.ts';

/** Any fixed number works. It just has to be the same every time this runs. */
const MigrationLockId = 4_815_162_342;

/**
 * Brings the database schema up to date by running the migrations it hasn't run yet.
 * Each migration runs in its own transaction together with its row in `schema_migrations`,
 * so a failing migration leaves no half-finished changes behind.
 *
 * @returns the versions that were run.
 */
export async function runMigrations(
  pool: DatabasePool,
  migrations: Migration[] = allMigrations
): Promise<number[]> {
  checkOrder(migrations);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    integer PRIMARY KEY,
      name       text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const ran: number[] = [];
  for (const migration of migrations) {
    const didRun = await withTransaction(pool, async (db) => {
      // If two API instances start at once, the second waits here instead of running it twice.
      await db.query('SELECT pg_advisory_xact_lock($1)', [MigrationLockId]);
      const existing = await db.query('SELECT 1 FROM schema_migrations WHERE version = $1', [
        migration.version,
      ]);
      if (existing.rowCount !== 0) {
        return false;
      }
      await db.query(migration.sql);
      await db.query('INSERT INTO schema_migrations (version, name) VALUES ($1, $2)', [
        migration.version,
        migration.name,
      ]);
      return true;
    });
    if (didRun) {
      ran.push(migration.version);
    }
  }
  return ran;
}

function checkOrder(migrations: Migration[]): void {
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new Error(
        `Migration "${migration.name}" has version ${migration.version}, expected ${index + 1}`
      );
    }
  });
}
