import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { DatabasePool } from '../src/db/database.ts';
import { buildTestApp } from './helpers/test-app.ts';
import { createTestDatabase } from './helpers/test-database.ts';

let pool: DatabasePool;

beforeAll(async () => {
  pool = await createTestDatabase({ migrate: false });
});

afterAll(async () => {
  await pool.end();
});

describe('GET /v1/health', () => {
  it('reports ok when the database is reachable', async () => {
    const app = await buildTestApp(pool);

    const response = await app.inject({ method: 'GET', url: '/v1/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('reports 503 when the database is down', async () => {
    const brokenPool = {
      query: () => Promise.reject(new Error('connection refused')),
    } as unknown as DatabasePool;
    const app = await buildTestApp(brokenPool);

    const response = await app.inject({ method: 'GET', url: '/v1/health' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'database_unavailable' });
  });
});

describe('errors', () => {
  it('answers unknown paths with 404 in the shared error format', async () => {
    const app = await buildTestApp(pool);

    const response = await app.inject({ method: 'GET', url: '/v1/does-not-exist' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: 'not_found', message: 'GET /v1/does-not-exist does not exist' },
    });
  });
});

describe('documentation', () => {
  it('generates an OpenAPI document with every route', async () => {
    const app = await buildTestApp(pool);

    const response = await app.inject({ method: 'GET', url: '/documentation/json' });

    expect(response.statusCode).toBe(200);
    expect(Object.keys(response.json().paths)).toEqual(
      expect.arrayContaining(['/v1/health', '/v1/auth/signup', '/v1/me'])
    );
  });
});
