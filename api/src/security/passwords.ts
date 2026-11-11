import argon2 from 'argon2';

/**
 * Hashes a password with argon2id (the library's default), with a random salt built into the
 * result. The plain password is never stored.
 */
export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

/** Whether `password` matches `passwordHash`. A malformed hash counts as no match. */
export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

// Made once, on first use. Reused only by `rejectUnknownUser`, never changed afterwards.
let dummyHash: Promise<string> | undefined;

/**
 * Takes as long as checking a real password, then returns false. Login calls it for unknown
 * emails, so response times don't reveal which emails have an account.
 */
export async function rejectUnknownUser(password: string): Promise<false> {
  dummyHash ??= hashPassword('not a real password');
  await verifyPassword(await dummyHash, password);
  return false;
}
