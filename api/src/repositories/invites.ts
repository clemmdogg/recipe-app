import type { Database } from '../db/database.ts';

export type StoredInvite = {
  code: string;
  householdId: string;
  expiresAt: Date;
};

export async function insertInvite(
  db: Database,
  invite: { code: string; householdId: string; createdBy: string; expiresAt: Date }
): Promise<void> {
  await db.query(
    'INSERT INTO invites (code, household_id, created_by, expires_at) VALUES ($1, $2, $3, $4)',
    [invite.code, invite.householdId, invite.createdBy, invite.expiresAt]
  );
}

/** `code` must be normalized (uppercase, no dash). */
export async function findInvite(db: Database, code: string): Promise<StoredInvite | null> {
  const result = await db.query<{ code: string; household_id: string; expires_at: Date }>(
    'SELECT code, household_id, expires_at FROM invites WHERE code = $1',
    [code]
  );
  const row = result.rows[0];
  return row ? { code: row.code, householdId: row.household_id, expiresAt: row.expires_at } : null;
}
