import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { withTransaction, type DatabasePool } from '../src/db/database.ts';
import { runMigrations } from '../src/db/migrate.ts';
import { migrations } from '../src/db/migrations/index.ts';
import { createTestDatabase } from './helpers/test-database.ts';

let pool: DatabasePool;

beforeAll(async () => {
  pool = await createTestDatabase({ migrate: false });
});

afterAll(async () => {
  await pool.end();
});

/** Creates a household with one member, the way signup will. Returns the household id. */
async function createHousehold(name = 'Test household'): Promise<string> {
  return withTransaction(pool, async (db) => {
    const userId = crypto.randomUUID();
    const household = await db.query<{ id: string }>(
      'INSERT INTO households (name, created_by) VALUES ($1, $2) RETURNING id',
      [name, userId]
    );
    const householdId = household.rows[0]!.id;
    await db.query(
      `INSERT INTO users (id, email, password_hash, name, household_id)
       VALUES ($1, $2, 'not-a-real-hash', 'Anna', $3)`,
      [userId, `${userId}@example.com`, householdId]
    );
    return householdId;
  });
}

describe('runMigrations', () => {
  it('runs every migration on an empty database, and nothing the second time', async () => {
    expect(await runMigrations(pool)).toEqual(migrations.map((migration) => migration.version));
    expect(await runMigrations(pool)).toEqual([]);
  });

  it('rejects migrations that are out of order', async () => {
    const outOfOrder = [{ version: 2, name: 'second', sql: 'SELECT 1' }];

    await expect(runMigrations(pool, outOfOrder)).rejects.toThrow('expected 1');
  });
});

describe('the initial schema', () => {
  it('gives a row a new change number and updated_at when it changes', async () => {
    const householdId = await createHousehold();
    const id = crypto.randomUUID();
    const inserted = await pool.query<{ change_number: number; updated_at: Date }>(
      `INSERT INTO pantry_items (household_id, id, ingredient_name, updated_at)
       VALUES ($1, $2, 'Garlic', '2000-01-01T00:00:00Z')
       RETURNING change_number, updated_at`,
      [householdId, id]
    );

    const updated = await pool.query<{ change_number: number; updated_at: Date }>(
      `UPDATE pantry_items SET deleted_at = now(), updated_at = '2000-01-01T00:00:00Z'
       WHERE household_id = $1 AND id = $2
       RETURNING change_number, updated_at`,
      [householdId, id]
    );

    const before = inserted.rows[0]!;
    const after = updated.rows[0]!;
    expect(after.change_number).toBeGreaterThan(before.change_number);
    // The server sets updated_at, whatever the update tried to write.
    expect(after.updated_at.getFullYear()).toBeGreaterThan(2000);
  });

  it('lets two households use the same name-based id', async () => {
    const sharedId = crypto.randomUUID();
    for (const householdId of [await createHousehold('A'), await createHousehold('B')]) {
      await pool.query(
        `INSERT INTO pantry_items (household_id, id, ingredient_name) VALUES ($1, $2, 'Garlic')`,
        [householdId, sharedId]
      );
    }

    const count = await pool.query<{ count: number }>(
      'SELECT count(*) AS count FROM pantry_items WHERE id = $1',
      [sharedId]
    );
    expect(count.rows[0]!.count).toBe(2);
  });

  it("doesn't let a row point to another household's recipe", async () => {
    const householdA = await createHousehold('A');
    const householdB = await createHousehold('B');
    await pool.query(`INSERT INTO recipes (household_id, id, name) VALUES ($1, '52772', 'Teriyaki')`, [
      householdA,
    ]);

    await expect(
      pool.query(
        `INSERT INTO meal_plan_entries (household_id, id, date, recipe_id)
         VALUES ($1, $2, '2026-11-14', '52772')`,
        [householdB, crypto.randomUUID()]
      )
    ).rejects.toThrow(/foreign key/);
  });

  it('returns calendar dates as YYYY-MM-DD strings', async () => {
    const householdId = await createHousehold();
    await pool.query(`INSERT INTO recipes (household_id, id, name) VALUES ($1, '1', 'Soup')`, [
      householdId,
    ]);
    const entry = await pool.query<{ date: string }>(
      `INSERT INTO meal_plan_entries (household_id, id, date, recipe_id)
       VALUES ($1, $2, '2026-11-14', '1') RETURNING date`,
      [householdId, crypto.randomUUID()]
    );

    expect(entry.rows[0]!.date).toBe('2026-11-14');
  });

  it('deletes all household data when the household is deleted', async () => {
    const householdId = await createHousehold();
    await pool.query(
      `INSERT INTO pantry_items (household_id, id, ingredient_name) VALUES ($1, $2, 'Salt')`,
      [householdId, crypto.randomUUID()]
    );

    // Members move to another household before an empty household is deleted.
    const other = await createHousehold('Other');
    await withTransaction(pool, async (db) => {
      await db.query('UPDATE users SET household_id = $1 WHERE household_id = $2', [other, householdId]);
      await db.query('DELETE FROM households WHERE id = $1', [householdId]);
    });

    const left = await pool.query('SELECT 1 FROM pantry_items WHERE household_id = $1', [householdId]);
    expect(left.rowCount).toBe(0);
  });
});
