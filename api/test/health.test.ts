import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.ts';
import type { Database, DatabasePool } from '../src/db/database.ts';
import { createTestDatabase } from './helpers/test-database.ts';

describe('GET /v1/health', () => {
  let pool: DatabasePool;

  beforeAll(async () => {
    pool = await createTestDatabase({ migrate: false });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('reports ok when the database is reachable', async () => {
    const app = await buildApp({ db: pool });

    const response = await app.inject({ method: 'GET', url: '/v1/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('reports 503 when the database is down', async () => {
    const brokenDatabase: Database = {
      query: () => Promise.reject(new Error('connection refused')),
    } as unknown as Database;
    const app = await buildApp({ db: brokenDatabase });

    const response = await app.inject({ method: 'GET', url: '/v1/health' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'database_unavailable' });
  });
});

describe('errors', () => {
  it('answers unknown paths with 404 in the shared error format', async () => {
    const app = await buildApp({ db: {} as Database });

    const response = await app.inject({ method: 'GET', url: '/v1/does-not-exist' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: 'not_found', message: 'GET /v1/does-not-exist does not exist' },
    });
  });
});
