import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { DatabasePool } from '../src/db/database.ts';
import type { SignedInUser } from '../src/services/auth.ts';
import { normalizeInviteCode } from '../src/security/invite-codes.ts';
import { addPantryItem, bearer, createInvite, join, signUp, type TestApp } from './helpers/accounts.ts';
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

function preview(user: SignedInUser, code: string) {
  return app.inject({ method: 'GET', url: `/v1/invites/${code}`, headers: bearer(user.accessToken) });
}

function accept(user: SignedInUser, code: string, payload?: object) {
  return app.inject({
    method: 'POST',
    url: `/v1/invites/${code}/accept`,
    headers: bearer(user.accessToken),
    payload,
  });
}

async function householdExists(id: string): Promise<boolean> {
  return (await pool.query('SELECT 1 FROM households WHERE id = $1', [id])).rowCount === 1;
}

describe('GET /v1/invites/:code', () => {
  it("shows the household's name and size", async () => {
    const anna = await signUp(app, { name: 'Anna' });
    const ben = await signUp(app);
    const code = await createInvite(app, anna);

    const response = await preview(ben, code);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      householdName: "Anna's household",
      memberCount: 1,
      expiresAt: expect.any(String),
      joiningDeletesData: false,
    });
  });

  it('accepts the code as people type it: lowercase, without the dash', async () => {
    const anna = await signUp(app);
    const ben = await signUp(app);
    const code = await createInvite(app, anna);

    const response = await preview(ben, ` ${code.replace('-', '').toLowerCase()} `.trim());

    expect(response.statusCode).toBe(200);
  });

  it('warns when the user is alone in a household with data', async () => {
    const anna = await signUp(app);
    const ben = await signUp(app);
    await addPantryItem(pool, ben.household.id);

    const response = await preview(ben, await createInvite(app, anna));

    expect(response.json().joiningDeletesData).toBe(true);
  });

  it('answers unknown, expired and own-household codes with their own errors', async () => {
    const anna = await signUp(app);
    const ben = await signUp(app);
    const code = await createInvite(app, anna);

    expect((await preview(ben, 'AAAA-AAAA')).json().error.code).toBe('invite_not_found');
    expect((await preview(anna, code)).json().error.code).toBe('already_member');

    await pool.query("UPDATE invites SET expires_at = now() - interval '1 second' WHERE code = $1", [
      normalizeInviteCode(code),
    ]);
    const expired = await preview(ben, code);
    expect(expired.statusCode).toBe(410);
    expect(expired.json().error.code).toBe('invite_expired');
  });
});

describe('POST /v1/invites/:code/accept', () => {
  it('moves the user in and deletes their old, empty household', async () => {
    const anna = await signUp(app);
    const ben = await signUp(app);

    const response = await accept(ben, await createInvite(app, anna));

    expect(response.statusCode).toBe(200);
    expect(response.json().id).toBe(anna.household.id);
    expect(response.json().members.map((member: { id: string }) => member.id)).toEqual([
      anna.user.id,
      ben.user.id,
    ]);
    expect(await householdExists(ben.household.id)).toBe(false);
  });

  it('works without a body when nothing would be lost', async () => {
    const anna = await signUp(app);
    const ben = await signUp(app);

    const response = await accept(ben, await createInvite(app, anna));

    expect(response.statusCode).toBe(200);
  });

  it('needs confirmDataLoss before deleting the old household with its data', async () => {
    const anna = await signUp(app);
    const ben = await signUp(app);
    await addPantryItem(pool, ben.household.id);
    const code = await createInvite(app, anna);

    const unconfirmed = await accept(ben, code, {});
    expect(unconfirmed.statusCode).toBe(409);
    expect(unconfirmed.json().error.code).toBe('data_loss_not_confirmed');
    expect(await householdExists(ben.household.id)).toBe(true);

    const confirmed = await accept(ben, code, { confirmDataLoss: true });
    expect(confirmed.statusCode).toBe(200);
    expect(await householdExists(ben.household.id)).toBe(false);
    const leftover = await pool.query('SELECT 1 FROM pantry_items WHERE household_id = $1', [
      ben.household.id,
    ]);
    expect(leftover.rowCount).toBe(0);
  });

  it("keeps the old household for its other members, with the longest-standing as creator", async () => {
    const anna = await signUp(app);
    const ben = await signUp(app);
    const carl = await signUp(app);
    await join(app, anna, ben);
    await addPantryItem(pool, anna.household.id);

    // Anna, the creator, moves to Carl's household. Ben stays and takes over.
    const response = await accept(anna, await createInvite(app, carl), {});

    expect(response.statusCode).toBe(200);
    const old = await pool.query<{ created_by: string }>(
      'SELECT created_by FROM households WHERE id = $1',
      [anna.household.id]
    );
    expect(old.rows[0]!.created_by).toBe(ben.user.id);
  });

  it('can be used more than once', async () => {
    const anna = await signUp(app);
    const code = await createInvite(app, anna);

    expect((await accept(await signUp(app), code)).statusCode).toBe(200);
    expect((await accept(await signUp(app), code)).statusCode).toBe(200);
  });
});
