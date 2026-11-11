import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { DatabasePool } from '../src/db/database.ts';
import { bearer, signUp, TestPassword, type TestApp } from './helpers/accounts.ts';
import { buildTestApp } from './helpers/test-app.ts';
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

function post(url: string, payload: object) {
  return app.inject({ method: 'POST', url, payload });
}

describe('POST /v1/auth/signup', () => {
  it('creates the user with their own household and logs them in', async () => {
    const response = await post('/v1/auth/signup', {
      email: '  Anna.Jensen@Example.com ',
      password: TestPassword,
      name: ' Anna ',
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.user).toEqual({ id: expect.any(String), email: 'anna.jensen@example.com', name: 'Anna' });
    expect(body.household).toEqual({ id: expect.any(String), name: "Anna's household" });
    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.refreshToken).toEqual(expect.any(String));

    const me = await app.inject({ method: 'GET', url: '/v1/me', headers: bearer(body.accessToken) });
    expect(me.json().household.id).toBe(body.household.id);
  });

  it('stores an argon2id hash, never the password', async () => {
    const { user } = await signUp(app);

    const stored = await pool.query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [user.id]
    );

    expect(stored.rows[0]!.password_hash).toMatch(/^\$argon2id\$/);
    expect(stored.rows[0]!.password_hash).not.toContain(TestPassword);
  });

  it('refuses an email that is already registered, in any letter case', async () => {
    await signUp(app, { email: 'taken@example.com' });

    const response = await post('/v1/auth/signup', {
      email: 'TAKEN@example.com',
      password: TestPassword,
      name: 'Ben',
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('email_taken');
  });

  it('refuses invalid input and says which fields are wrong', async () => {
    const response = await post('/v1/auth/signup', { email: 'not-an-email', password: 'short', name: '' });

    expect(response.statusCode).toBe(400);
    const { error } = response.json();
    expect(error.code).toBe('validation_failed');
    expect(error.details.map((detail: { path: string }) => detail.path)).toEqual(
      expect.arrayContaining(['body/email', 'body/password', 'body/name'])
    );
  });
});

describe('POST /v1/auth/login', () => {
  it('logs in with the right password, ignoring the email letter case', async () => {
    const { user } = await signUp(app, { email: 'login@example.com' });

    const response = await post('/v1/auth/login', { email: 'Login@Example.com', password: TestPassword });

    expect(response.statusCode).toBe(200);
    expect(response.json().user.id).toBe(user.id);
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    await signUp(app, { email: 'wrong-password@example.com' });

    const wrongPassword = await post('/v1/auth/login', {
      email: 'wrong-password@example.com',
      password: 'not the password',
    });
    const unknownEmail = await post('/v1/auth/login', {
      email: 'nobody@example.com',
      password: TestPassword,
    });

    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownEmail.statusCode).toBe(401);
    expect(wrongPassword.json()).toEqual(unknownEmail.json());
    expect(wrongPassword.json().error.code).toBe('invalid_credentials');
  });
});

describe('POST /v1/auth/refresh', () => {
  it('swaps a refresh token for a new pair that works', async () => {
    const { refreshToken } = await signUp(app);

    const response = await post('/v1/auth/refresh', { refreshToken });

    expect(response.statusCode).toBe(200);
    const tokens = response.json();
    expect(tokens.refreshToken).not.toBe(refreshToken);
    const me = await app.inject({ method: 'GET', url: '/v1/me', headers: bearer(tokens.accessToken) });
    expect(me.statusCode).toBe(200);
  });

  it('logs the user out everywhere when a used token is used again', async () => {
    const { refreshToken: first } = await signUp(app);
    const second = (await post('/v1/auth/refresh', { refreshToken: first })).json().refreshToken;

    const reused = await post('/v1/auth/refresh', { refreshToken: first });
    const afterReuse = await post('/v1/auth/refresh', { refreshToken: second });

    expect(reused.statusCode).toBe(401);
    expect(reused.json().error.code).toBe('invalid_refresh_token');
    expect(afterReuse.statusCode).toBe(401);
  });

  it('refuses an expired or unknown token', async () => {
    const { user, refreshToken } = await signUp(app);
    await pool.query(
      "UPDATE refresh_tokens SET expires_at = now() - interval '1 second' WHERE user_id = $1",
      [user.id]
    );

    expect((await post('/v1/auth/refresh', { refreshToken })).statusCode).toBe(401);
    expect((await post('/v1/auth/refresh', { refreshToken: 'made-up' })).statusCode).toBe(401);
  });
});

describe('POST /v1/auth/logout', () => {
  it('revokes the refresh token', async () => {
    const { refreshToken } = await signUp(app);

    const response = await post('/v1/auth/logout', { refreshToken });

    expect(response.statusCode).toBe(204);
    expect((await post('/v1/auth/refresh', { refreshToken })).statusCode).toBe(401);
  });

  it('succeeds even with an unknown token', async () => {
    expect((await post('/v1/auth/logout', { refreshToken: 'made-up' })).statusCode).toBe(204);
  });
});

describe('rate limiting', () => {
  it('blocks login after too many attempts from one IP address', async () => {
    const limitedApp = await buildTestApp(pool, { authRateLimit: { max: 2, timeWindow: '1 minute' } });
    const attempt = () =>
      limitedApp.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'nobody@example.com', password: 'guess' },
      });

    await attempt();
    await attempt();
    const third = await attempt();

    expect(third.statusCode).toBe(429);
    expect(third.json().error.code).toBe('rate_limited');
    await limitedApp.close();
  });
});
