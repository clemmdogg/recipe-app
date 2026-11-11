import { createHash, randomBytes } from 'node:crypto';

export const RefreshTokenLifetimeDays = 30;

/** 32 random bytes: impossible to guess. Not a JWT, just a random string the server looks up. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Only this hash is stored, so a leaked database contains no usable tokens. A fast hash is
 * enough here (unlike passwords), because the token is long and random, not chosen by a person.
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
