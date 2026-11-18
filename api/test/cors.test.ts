import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { DatabasePool } from '../src/db/database.ts';
import { loadConfig } from '../src/config.ts';
import { buildTestApp } from './helpers/test-app.ts';
import { createTestDatabase } from './helpers/test-database.ts';

let pool: DatabasePool;

beforeAll(async () => {
  pool = await createTestDatabase({ migrate: false });
});

afterAll(async () => {
  await pool.end();
});

/** What a browser asks before sending a request with an Authorization header to another address. */
function preflight(app: Awaited<ReturnType<typeof buildTestApp>>, origin: string) {
  return app.inject({
    method: 'OPTIONS',
    url: '/v1/me',
    headers: {
      origin,
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'authorization',
    },
  });
}

describe('CORS', () => {
  it('lets the web app call the API from an allowed address', async () => {
    const app = await buildTestApp(pool, { corsOrigins: ['http://localhost:8081'] });

    const response = await preflight(app, 'http://localhost:8081');

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8081');
    expect(response.headers['access-control-allow-headers']).toMatch(/Authorization/);
    expect(response.headers['access-control-allow-methods']).toMatch(/DELETE/);
  });

  it("doesn't allow other websites", async () => {
    const app = await buildTestApp(pool, { corsOrigins: ['http://localhost:8081'] });

    const response = await preflight(app, 'https://evil.example.com');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('reads the allowed addresses from a comma-separated setting', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgres://localhost/test',
      JWT_SECRET: 'x'.repeat(32),
      CORS_ORIGINS: 'http://localhost:8081, https://recipes.example.com',
    });

    expect(config.CORS_ORIGINS).toEqual(['http://localhost:8081', 'https://recipes.example.com']);
  });
});
