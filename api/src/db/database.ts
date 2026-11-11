import pg from 'pg';

/*
 * Return Postgres values in the formats the app uses:
 * - `date` columns as 'YYYY-MM-DD' strings. By default pg turns them into a JavaScript Date at
 *   local midnight, which can shift the day.
 * - `bigint` columns (change numbers, counts) as numbers. They stay far below 2^53.
 */
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));

/** A pool of database connections, shared by the whole API. */
export type DatabasePool = pg.Pool;

/**
 * What repository functions need: something to run a query on. Both the pool and a single
 * connection inside a transaction fit, so the same function works in and outside transactions.
 */
export type Database = Pick<pg.Pool | pg.PoolClient, 'query'>;

export function createPool(connectionString: string): DatabasePool {
  return new pg.Pool({ connectionString });
}

/**
 * Runs `work` in a transaction: everything it does is saved together, or nothing is if it throws.
 */
export async function withTransaction<T>(
  pool: DatabasePool,
  work: (db: Database) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
