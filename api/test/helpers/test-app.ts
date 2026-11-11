import { buildApp, type AppOptions } from '../../src/app.ts';
import type { DatabasePool } from '../../src/db/database.ts';

export const TestAccessTokenSecret = 'test-secret-that-is-at-least-32-characters-long';

/** The API with test settings. Rate limits are high unless a test sets its own. */
export function buildTestApp(pool: DatabasePool, options: Partial<AppOptions> = {}) {
  return buildApp({
    pool,
    accessTokenSecret: TestAccessTokenSecret,
    authRateLimit: { max: 1000, timeWindow: '1 minute' },
    ...options,
  });
}
