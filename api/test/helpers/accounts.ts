import { randomUUID } from 'node:crypto';

import type { DatabasePool } from '../../src/db/database.ts';
import type { SignedInUser } from '../../src/services/auth.ts';
import type { buildTestApp } from './test-app.ts';

export type TestApp = Awaited<ReturnType<typeof buildTestApp>>;

export const TestPassword = 'correct horse battery';

/** Signs up a new user through the API. Every call gets a unique email unless one is given. */
export async function signUp(
  app: TestApp,
  input: { email?: string; password?: string; name?: string } = {}
): Promise<SignedInUser> {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/auth/signup',
    payload: {
      email: `user-${randomUUID()}@example.com`,
      password: TestPassword,
      name: 'Anna',
      ...input,
    },
  });
  if (response.statusCode !== 201) {
    throw new Error(`Signup failed with ${response.statusCode}: ${response.body}`);
  }
  return response.json();
}

/**
 * Puts an extra user straight into a household, as joining with an invite will once it exists.
 * They can't log in (their password hash is fake). Returns their id.
 */
export async function addMember(
  pool: DatabasePool,
  householdId: string,
  joinedAt: Date
): Promise<string> {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO users (id, email, password_hash, name, household_id, joined_household_at)
     VALUES ($1, $2, 'not-a-real-hash', 'Member', $3, $4)`,
    [id, `${id}@example.com`, householdId, joinedAt]
  );
  return id;
}

export function bearer(accessToken: string): { authorization: string } {
  return { authorization: `Bearer ${accessToken}` };
}

/** Creates an invite as `inviter` through the API and returns its code, e.g. "K7MQ-2XPA". */
export async function createInvite(app: TestApp, inviter: SignedInUser): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/household/invites',
    headers: bearer(inviter.accessToken),
  });
  if (response.statusCode !== 201) {
    throw new Error(`Creating an invite failed with ${response.statusCode}: ${response.body}`);
  }
  return response.json().code;
}

/** Moves `joiner` into `inviter`'s household with an invite, through the API. */
export async function join(app: TestApp, inviter: SignedInUser, joiner: SignedInUser): Promise<void> {
  const code = await createInvite(app, inviter);
  const response = await app.inject({
    method: 'POST',
    url: `/v1/invites/${code}/accept`,
    headers: bearer(joiner.accessToken),
    payload: { confirmDataLoss: true },
  });
  if (response.statusCode !== 200) {
    throw new Error(`Joining failed with ${response.statusCode}: ${response.body}`);
  }
}

/** Gives the household some data, so leaving it as the last member would delete something. */
export async function addPantryItem(pool: DatabasePool, householdId: string): Promise<void> {
  await pool.query(
    `INSERT INTO pantry_items (household_id, id, ingredient_name) VALUES ($1, gen_random_uuid(), 'Salt')`,
    [householdId]
  );
}
