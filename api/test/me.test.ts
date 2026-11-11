import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { DatabasePool } from '../src/db/database.ts';
import { createAccessToken, createAccessTokenKey } from '../src/security/access-tokens.ts';
import { addMember, bearer, signUp, TestPassword, type TestApp } from './helpers/accounts.ts';
import { buildTestApp, TestAccessTokenSecret } from './helpers/test-app.ts';
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

function getMe(headers: Record<string, string> = {}) {
  return app.inject({ method: 'GET', url: '/v1/me', headers });
}

function deleteMe(accessToken: string, password: string) {
  return app.inject({
    method: 'DELETE',
    url: '/v1/me',
    headers: bearer(accessToken),
    payload: { password },
  });
}

async function householdCreator(householdId: string): Promise<string | null> {
  const result = await pool.query<{ created_by: string }>(
    'SELECT created_by FROM households WHERE id = $1',
    [householdId]
  );
  return result.rows[0]?.created_by ?? null;
}

describe('the access token check', () => {
  it('refuses requests without a token', async () => {
    const response = await getMe();

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('unauthenticated');
  });

  it('refuses a token signed with another secret', async () => {
    const { user } = await signUp(app);
    const forged = await createAccessToken(user.id, createAccessTokenKey('x'.repeat(32)));

    expect((await getMe(bearer(forged))).json().error.code).toBe('unauthenticated');
  });

  it('tells the app when a token has expired, so it can refresh', async () => {
    const { user } = await signUp(app);
    const anHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const expired = await createAccessToken(user.id, createAccessTokenKey(TestAccessTokenSecret), anHourAgo);

    const response = await getMe(bearer(expired));

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('token_expired');
  });
});

describe('GET /v1/me', () => {
  it('returns the user and their household', async () => {
    const { user, household, accessToken } = await signUp(app, { name: 'Ben' });

    const response = await getMe(bearer(accessToken));

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ user, household });
  });
});

describe('DELETE /v1/me', () => {
  it('needs the right password', async () => {
    const { accessToken } = await signUp(app);

    const response = await deleteMe(accessToken, 'not the password');

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('wrong_password');
    expect((await getMe(bearer(accessToken))).statusCode).toBe(200);
  });

  it('deletes the last member together with the household and its data', async () => {
    const { user, household, accessToken, refreshToken } = await signUp(app);
    await pool.query(
      `INSERT INTO pantry_items (household_id, id, ingredient_name) VALUES ($1, gen_random_uuid(), 'Salt')`,
      [household.id]
    );

    const response = await deleteMe(accessToken, TestPassword);

    expect(response.statusCode).toBe(204);
    expect((await pool.query('SELECT 1 FROM users WHERE id = $1', [user.id])).rowCount).toBe(0);
    expect((await pool.query('SELECT 1 FROM households WHERE id = $1', [household.id])).rowCount).toBe(0);
    expect(
      (await pool.query('SELECT 1 FROM pantry_items WHERE household_id = $1', [household.id])).rowCount
    ).toBe(0);
    expect((await getMe(bearer(accessToken))).statusCode).toBe(401);
    const refreshed = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken } });
    expect(refreshed.statusCode).toBe(401);
  });

  it('hands the household to the longest-standing member when the creator leaves', async () => {
    const { household, accessToken } = await signUp(app);
    const newer = await addMember(pool, household.id, new Date('2026-11-05T12:00:00Z'));
    const older = await addMember(pool, household.id, new Date('2026-11-02T12:00:00Z'));

    expect((await deleteMe(accessToken, TestPassword)).statusCode).toBe(204);

    expect(await householdCreator(household.id)).toBe(older);
    const members = await pool.query<{ id: string }>(
      'SELECT id FROM users WHERE household_id = $1 ORDER BY id',
      [household.id]
    );
    expect(members.rows.map((row) => row.id)).toEqual([newer, older].sort());
  });
});
