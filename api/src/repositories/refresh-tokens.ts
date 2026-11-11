import type { Database } from '../db/database.ts';

export type StoredRefreshToken = {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export async function insertRefreshToken(
  db: Database,
  token: { id: string; userId: string; tokenHash: string; expiresAt: Date }
): Promise<void> {
  await db.query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
    [token.id, token.userId, token.tokenHash, token.expiresAt]
  );
}

/**
 * Finds a token by its hash and locks it until the transaction ends, so the same token can't
 * be used by two requests at once.
 */
export async function lockRefreshToken(
  db: Database,
  tokenHash: string
): Promise<StoredRefreshToken | null> {
  const result = await db.query<{
    id: string;
    user_id: string;
    expires_at: Date;
    revoked_at: Date | null;
  }>(
    `SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens
     WHERE token_hash = $1
     FOR UPDATE`,
    [tokenHash]
  );
  const row = result.rows[0];
  return row
    ? { id: row.id, userId: row.user_id, expiresAt: row.expires_at, revokedAt: row.revoked_at }
    : null;
}

/** Marks a token as used up. `replacedBy` is the token issued in its place, if any. */
export async function revokeRefreshToken(
  db: Database,
  id: string,
  replacedBy: string | null = null
): Promise<void> {
  await db.query(
    `UPDATE refresh_tokens SET revoked_at = now(), replaced_by = $2
     WHERE id = $1 AND revoked_at IS NULL`,
    [id, replacedBy]
  );
}

export async function revokeRefreshTokenByHash(db: Database, tokenHash: string): Promise<void> {
  await db.query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL',
    [tokenHash]
  );
}

/** Logs the user out on every device. */
export async function revokeAllRefreshTokens(db: Database, userId: string): Promise<void> {
  await db.query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId]
  );
}
