import { createPool, type DatabasePool } from '../../src/db/database.ts';
import { runMigrations } from '../../src/db/migrate.ts';

/**
 * Connects to the test database (TEST_DATABASE_URL) and empties it, so every test file starts
 * from a clean database. Pass `migrate: false` to get an empty database without tables.
 * Call `pool.end()` in `afterAll`.
 */
export async function createTestDatabase({ migrate = true } = {}): Promise<DatabasePool> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL must not be the development database: tests delete everything.');
  }

  const pool = createPool(url);
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  if (migrate) {
    await runMigrations(pool);
  }
  return pool;
}
