import type { Database } from '../db/database.ts';
import type { User } from '../types/account.ts';

type UserRow = {
  id: string;
  email: string;
  name: string;
  household_id: string;
};

const UserColumns = 'id, email, name, household_id';

function toUser(row: UserRow): User {
  return { id: row.id, email: row.email, name: row.name, householdId: row.household_id };
}

export async function insertUser(
  db: Database,
  user: { id: string; email: string; name: string; passwordHash: string; householdId: string }
): Promise<User> {
  const result = await db.query<UserRow>(
    `INSERT INTO users (id, email, name, password_hash, household_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${UserColumns}`,
    [user.id, user.email, user.name, user.passwordHash, user.householdId]
  );
  return toUser(result.rows[0]!);
}

export async function findUserById(db: Database, id: string): Promise<User | null> {
  const result = await db.query<UserRow>(`SELECT ${UserColumns} FROM users WHERE id = $1`, [id]);
  return result.rows[0] ? toUser(result.rows[0]) : null;
}

/** For login: the user with their password hash. `email` must already be lowercase. */
export async function findUserWithPasswordByEmail(
  db: Database,
  email: string
): Promise<(User & { passwordHash: string }) | null> {
  const result = await db.query<UserRow & { password_hash: string }>(
    `SELECT ${UserColumns}, password_hash FROM users WHERE email = $1`,
    [email]
  );
  const row = result.rows[0];
  return row ? { ...toUser(row), passwordHash: row.password_hash } : null;
}

export async function findPasswordHash(db: Database, userId: string): Promise<string | null> {
  const result = await db.query<{ password_hash: string }>(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0]?.password_hash ?? null;
}

/** The household's members, longest-standing first. */
export async function listMembers(
  db: Database,
  householdId: string
): Promise<{ id: string; name: string; joinedAt: Date }[]> {
  const result = await db.query<{ id: string; name: string; joined_household_at: Date }>(
    `SELECT id, name, joined_household_at FROM users
     WHERE household_id = $1
     ORDER BY joined_household_at, id`,
    [householdId]
  );
  return result.rows.map((row) => ({ id: row.id, name: row.name, joinedAt: row.joined_household_at }));
}

export async function countMembers(db: Database, householdId: string): Promise<number> {
  const result = await db.query<{ count: number }>(
    'SELECT count(*) AS count FROM users WHERE household_id = $1',
    [householdId]
  );
  return result.rows[0]!.count;
}

/** Moves the user to another household. Their join time starts again. */
export async function moveUserToHousehold(
  db: Database,
  userId: string,
  householdId: string
): Promise<void> {
  await db.query('UPDATE users SET household_id = $2, joined_household_at = now() WHERE id = $1', [
    userId,
    householdId,
  ]);
}

/**
 * The member who has been in the household the longest, apart from `exceptUserId`.
 * Ties (same join time) go to the lowest id, so the answer is always the same.
 */
export async function findLongestMember(
  db: Database,
  householdId: string,
  exceptUserId: string
): Promise<string | null> {
  const result = await db.query<{ id: string }>(
    `SELECT id FROM users
     WHERE household_id = $1 AND id <> $2
     ORDER BY joined_household_at, id
     LIMIT 1`,
    [householdId, exceptUserId]
  );
  return result.rows[0]?.id ?? null;
}

/** Deletes the user. Their refresh tokens go with them (ON DELETE CASCADE). */
export async function deleteUser(db: Database, id: string): Promise<void> {
  await db.query('DELETE FROM users WHERE id = $1', [id]);
}
