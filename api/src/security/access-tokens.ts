import { errors, jwtVerify, SignJWT } from 'jose';

export const AccessTokenLifetimeSeconds = 15 * 60;

/** The secret that signs access tokens, in the form `jose` needs. */
export type AccessTokenKey = Uint8Array;

export function createAccessTokenKey(secret: string): AccessTokenKey {
  return new TextEncoder().encode(secret);
}

/**
 * A signed JWT that proves who the user is for 15 minutes. It holds only the user id (`sub`),
 * not the household, because membership can change while the token is valid.
 */
export async function createAccessToken(
  userId: string,
  key: AccessTokenKey,
  now = new Date()
): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT()
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + AccessTokenLifetimeSeconds)
    .sign(key);
}

export type AccessTokenCheck =
  | { valid: true; userId: string }
  | { valid: false; reason: 'expired' | 'invalid' };

/** Checks the signature and expiry. Only HS256 is accepted, so a token can't pick a weaker algorithm. */
export async function verifyAccessToken(token: string, key: AccessTokenKey): Promise<AccessTokenCheck> {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string') {
      return { valid: false, reason: 'invalid' };
    }
    return { valid: true, userId: payload.sub };
  } catch (error) {
    return { valid: false, reason: error instanceof errors.JWTExpired ? 'expired' : 'invalid' };
  }
}
