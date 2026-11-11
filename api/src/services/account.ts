import { withTransaction, type DatabasePool } from '../db/database.ts';
import { ApiError } from '../errors.ts';
import { findHouseholdSummary } from '../repositories/households.ts';
import { deleteUser, findPasswordHash, findUserById } from '../repositories/users.ts';
import { verifyPassword } from '../security/passwords.ts';
import type { HouseholdSummary, User } from '../types/account.ts';
import { leaveHousehold } from './membership.ts';

export type Account = {
  user: Omit<User, 'householdId'>;
  household: HouseholdSummary;
};

export async function getAccount(pool: DatabasePool, userId: string): Promise<Account> {
  const user = await findUserById(pool, userId);
  const household = user ? await findHouseholdSummary(pool, user.householdId) : null;
  if (!user || !household) {
    throw new ApiError(401, 'unauthenticated', 'This account no longer exists');
  }
  return { user: { id: user.id, email: user.email, name: user.name }, household };
}

/**
 * Deletes the account for good, after checking the password again. The household's data stays
 * with the other members; if there are none, the household is deleted too.
 */
export async function deleteAccount(
  pool: DatabasePool,
  userId: string,
  password: string
): Promise<void> {
  const passwordHash = await findPasswordHash(pool, userId);
  if (!passwordHash || !(await verifyPassword(passwordHash, password))) {
    throw new ApiError(403, 'wrong_password', 'The password is wrong');
  }
  await withTransaction(pool, async (db) => {
    const user = await findUserById(db, userId);
    if (!user) {
      return;
    }
    await leaveHousehold(db, user.householdId, user.id);
    await deleteUser(db, user.id);
  });
}
