import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { DatabasePool } from '../src/db/database.ts';
import type { SignedInUser } from '../src/services/auth.ts';
import { addMember, bearer, join, signUp, type TestApp } from './helpers/accounts.ts';
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

function getHousehold(user: SignedInUser) {
  return app.inject({ method: 'GET', url: '/v1/household', headers: bearer(user.accessToken) });
}

/** Anna creates a household and Ben joins it. */
async function annaAndBen() {
  const anna = await signUp(app, { name: 'Anna' });
  const ben = await signUp(app, { name: 'Ben' });
  await join(app, anna, ben);
  return { anna, ben };
}

describe('GET /v1/household', () => {
  it('lists the members, longest-standing first, without their emails', async () => {
    const { anna, ben } = await annaAndBen();

    const response = await getHousehold(ben);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: anna.household.id,
      name: "Anna's household",
      createdBy: anna.user.id,
      members: [
        { id: anna.user.id, name: 'Anna', joinedAt: expect.any(String), isCreator: true },
        { id: ben.user.id, name: 'Ben', joinedAt: expect.any(String), isCreator: false },
      ],
    });
    expect(response.body).not.toContain('@example.com');
  });

  it('needs a login', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/household' });

    expect(response.statusCode).toBe(401);
  });
});

describe('PATCH /v1/household', () => {
  it('lets any member rename the household', async () => {
    const { anna, ben } = await annaAndBen();

    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/household',
      headers: bearer(ben.accessToken),
      payload: { name: ' The Jensens ' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().name).toBe('The Jensens');
    expect((await getHousehold(anna)).json().name).toBe('The Jensens');
  });

  it('refuses an empty name', async () => {
    const anna = await signUp(app);

    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/household',
      headers: bearer(anna.accessToken),
      payload: { name: '   ' },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('POST /v1/household/invites', () => {
  it('creates a 7-day invite with an easy-to-type code and a link', async () => {
    const anna = await signUp(app);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/household/invites',
      headers: bearer(anna.accessToken),
    });

    expect(response.statusCode).toBe(201);
    const invite = response.json();
    expect(invite.code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(invite.url).toBe(`http://localhost:3000/join/${invite.code}`);
    const daysValid = (Date.parse(invite.expiresAt) - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysValid).toBeCloseTo(7, 1);
  });
});

describe('POST /v1/household/leave', () => {
  it('gives the member a new empty household and leaves the old one as it was', async () => {
    const { anna, ben } = await annaAndBen();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/household/leave',
      headers: bearer(ben.accessToken),
    });

    expect(response.statusCode).toBe(200);
    const newHousehold = response.json();
    expect(newHousehold.id).not.toBe(anna.household.id);
    expect(newHousehold.name).toBe("Ben's household");
    expect(newHousehold.members).toEqual([expect.objectContaining({ id: ben.user.id, isCreator: true })]);
    // The same access token now gives the new household straight away.
    expect((await getHousehold(ben)).json().id).toBe(newHousehold.id);
    expect((await getHousehold(anna)).json().members).toHaveLength(1);
  });

  it('hands the household to the longest-standing member when the creator leaves', async () => {
    const anna = await signUp(app);
    const newer = await addMember(pool, anna.household.id, new Date('2026-11-05T12:00:00Z'));
    const older = await addMember(pool, anna.household.id, new Date('2026-11-02T12:00:00Z'));

    await app.inject({ method: 'POST', url: '/v1/household/leave', headers: bearer(anna.accessToken) });

    const creator = await pool.query<{ created_by: string }>(
      'SELECT created_by FROM households WHERE id = $1',
      [anna.household.id]
    );
    expect(creator.rows[0]!.created_by).toBe(older);
    expect(creator.rows[0]!.created_by).not.toBe(newer);
  });

  it('refuses when the user is the only member', async () => {
    const anna = await signUp(app);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/household/leave',
      headers: bearer(anna.accessToken),
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('only_member');
  });
});

describe('DELETE /v1/household/members/:userId', () => {
  function remove(remover: SignedInUser, userId: string) {
    return app.inject({
      method: 'DELETE',
      url: `/v1/household/members/${userId}`,
      headers: bearer(remover.accessToken),
    });
  }

  it('lets the creator remove a member, who gets a new empty household', async () => {
    const { anna, ben } = await annaAndBen();

    const response = await remove(anna, ben.user.id);

    expect(response.statusCode).toBe(204);
    expect((await getHousehold(anna)).json().members).toHaveLength(1);
    const bensHousehold = (await getHousehold(ben)).json();
    expect(bensHousehold.id).not.toBe(anna.household.id);
    expect(bensHousehold.name).toBe("Ben's household");
  });

  it("doesn't let other members remove anyone", async () => {
    const { anna, ben } = await annaAndBen();

    const response = await remove(ben, anna.user.id);

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('not_creator');
  });

  it('tells the creator to use leave instead of removing themselves', async () => {
    const { anna } = await annaAndBen();

    expect((await remove(anna, anna.user.id)).json().error.code).toBe('cannot_remove_self');
  });

  it("can't touch users in other households", async () => {
    const anna = await signUp(app);
    const stranger = await signUp(app);

    const response = await remove(anna, stranger.user.id);

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('member_not_found');
    expect((await getHousehold(stranger)).json().id).toBe(stranger.household.id);
  });
});
