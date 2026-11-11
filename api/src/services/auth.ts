import { randomUUID } from 'node:crypto';

import { isUniqueViolation, withTransaction, type Database, type DatabasePool } from '../db/database.ts';
import { ApiError } from '../errors.ts';
import { findHouseholdSummary, insertHousehold } from '../repositories/households.ts';
import {
  insertRefreshToken,
  lockRefreshToken,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  revokeRefreshTokenByHash,
} from '../repositories/refresh-tokens.ts';
import { findUserById, findUserWithPasswordByEmail, insertUser } from '../repositories/users.ts';
import {
  createAccessToken,
  verifyAccessToken,
  type AccessTokenKey,
} from '../security/access-tokens.ts';
import { hashPassword, rejectUnknownUser, verifyPassword } from '../security/passwords.ts';
import {
  generateRefreshToken,
  hashRefreshToken,
  RefreshTokenLifetimeDays,
} from '../security/refresh-tokens.ts';
import type {
  AuthenticatedUser,
  HouseholdSummary,
  TokenPair,
  User,
} from '../types/account.ts';

/** What the auth service needs: the database and the key that signs access tokens. */
export type AuthContext = {
  pool: DatabasePool;
  accessTokenKey: AccessTokenKey;
};

export type SignedInUser = TokenPair & {
  user: Omit<User, 'householdId'>;
  household: HouseholdSummary;
};

/** Creates a user with a new empty household, and logs them in. `email` must be lowercase. */
export async function signUp(
  { pool, accessTokenKey }: AuthContext,
  input: { email: string; password: string; name: string }
): Promise<SignedInUser> {
  // Hashing is slow on purpose, so do it before holding a database connection.
  const passwordHash = await hashPassword(input.password);
  try {
    return await withTransaction(pool, async (db) => {
      const userId = randomUUID();
      const household = await insertHousehold(db, {
        id: randomUUID(),
        name: `${input.name}'s household`,
        createdBy: userId,
      });
      const user = await insertUser(db, {
        id: userId,
        email: input.email,
        name: input.name,
        passwordHash,
        householdId: household.id,
      });
      const tokens = await issueTokens(db, accessTokenKey, user.id);
      return signedIn(user, household, tokens);
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(409, 'email_taken', 'An account with this email already exists');
    }
    throw error;
  }
}

/** `email` must be lowercase. */
export async function logIn(
  { pool, accessTokenKey }: AuthContext,
  input: { email: string; password: string }
): Promise<SignedInUser> {
  const user = await findUserWithPasswordByEmail(pool, input.email);
  const passwordMatches = user
    ? await verifyPassword(user.passwordHash, input.password)
    : await rejectUnknownUser(input.password);
  // The same error for an unknown email and a wrong password, so nobody can find out who has an account.
  if (!user || !passwordMatches) {
    throw new ApiError(401, 'invalid_credentials', 'Wrong email or password');
  }
  const household = await findHouseholdSummary(pool, user.householdId);
  if (!household) {
    throw new Error(`User ${user.id} has no household`);
  }
  const tokens = await issueTokens(pool, accessTokenKey, user.id);
  return signedIn(user, household, tokens);
}

/**
 * Swaps a refresh token for a new pair (rotation). Using a token that was already swapped means
 * it has probably been copied, so all of the user's tokens are revoked and they must log in again.
 */
export async function refresh(
  { pool, accessTokenKey }: AuthContext,
  refreshToken: string
): Promise<TokenPair> {
  const outcome = await withTransaction(pool, async (db) => {
    const stored = await lockRefreshToken(db, hashRefreshToken(refreshToken));
    if (!stored || stored.expiresAt <= new Date()) {
      return { ok: false } as const;
    }
    if (stored.revokedAt) {
      // Committed before the error is thrown, so the revocation sticks.
      await revokeAllRefreshTokens(db, stored.userId);
      return { ok: false } as const;
    }
    const tokens = await issueTokens(db, accessTokenKey, stored.userId);
    await revokeRefreshToken(db, stored.id, tokens.refreshTokenId);
    return { ok: true, tokens } as const;
  });
  if (!outcome.ok) {
    throw new ApiError(401, 'invalid_refresh_token', 'Log in again');
  }
  return { accessToken: outcome.tokens.accessToken, refreshToken: outcome.tokens.refreshToken };
}

/** Revokes the refresh token. Succeeds even if the token is unknown, so logging out always works. */
export async function logOut({ pool }: AuthContext, refreshToken: string): Promise<void> {
  await revokeRefreshTokenByHash(pool, hashRefreshToken(refreshToken));
}

/**
 * Checks an access token and looks up the user's current household. A deleted account or a
 * changed household takes effect at once, even while the token is still valid.
 */
export async function authenticate(
  { pool, accessTokenKey }: AuthContext,
  accessToken: string
): Promise<AuthenticatedUser> {
  const check = await verifyAccessToken(accessToken, accessTokenKey);
  if (!check.valid) {
    throw check.reason === 'expired'
      ? new ApiError(401, 'token_expired', 'The access token has expired. Refresh it.')
      : new ApiError(401, 'unauthenticated', 'The access token is invalid');
  }
  const user = await findUserById(pool, check.userId);
  if (!user) {
    throw new ApiError(401, 'unauthenticated', 'This account no longer exists');
  }
  return { id: user.id, householdId: user.householdId };
}

async function issueTokens(
  db: Database,
  accessTokenKey: AccessTokenKey,
  userId: string,
  now = new Date()
): Promise<TokenPair & { refreshTokenId: string }> {
  const refreshToken = generateRefreshToken();
  const refreshTokenId = randomUUID();
  await insertRefreshToken(db, {
    id: refreshTokenId,
    userId,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(now.getTime() + RefreshTokenLifetimeDays * 24 * 60 * 60 * 1000),
  });
  const accessToken = await createAccessToken(userId, accessTokenKey, now);
  return { accessToken, refreshToken, refreshTokenId };
}

function signedIn(user: User, household: HouseholdSummary, tokens: TokenPair): SignedInUser {
  return {
    user: { id: user.id, email: user.email, name: user.name },
    household,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}
