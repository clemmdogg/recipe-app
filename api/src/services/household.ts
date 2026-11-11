import { withTransaction, type Database, type DatabasePool } from '../db/database.ts';
import { ApiError } from '../errors.ts';
import { findHousehold, lockHousehold, renameHousehold } from '../repositories/households.ts';
import { countMembers, findUserById, listMembers } from '../repositories/users.ts';
import type { AuthenticatedUser, Household } from '../types/account.ts';
import { leaveHousehold, moveToNewHousehold } from './membership.ts';

/** The household with its members, longest-standing first. */
export async function getHousehold(db: Database, householdId: string): Promise<Household> {
  const household = await findHousehold(db, householdId);
  if (!household) {
    throw new Error(`Household ${householdId} does not exist`);
  }
  const members = await listMembers(db, householdId);
  return {
    id: household.id,
    name: household.name,
    createdBy: household.createdBy,
    members: members.map((member) => ({
      id: member.id,
      name: member.name,
      joinedAt: member.joinedAt.toISOString(),
      isCreator: member.id === household.createdBy,
    })),
  };
}

/** Any member can rename the household. */
export async function rename(
  pool: DatabasePool,
  auth: AuthenticatedUser,
  name: string
): Promise<Household> {
  await renameHousehold(pool, auth.householdId, name);
  return getHousehold(pool, auth.householdId);
}

/**
 * Moves the user to a new empty household. If they were the creator, the longest-standing
 * member takes over. Refused when they are alone, since they'd just swap one empty household
 * for another.
 */
export async function leave(pool: DatabasePool, auth: AuthenticatedUser): Promise<Household> {
  return withTransaction(pool, async (db) => {
    await lockHousehold(db, auth.householdId);
    if ((await countMembers(db, auth.householdId)) <= 1) {
      throw new ApiError(409, 'only_member', "You're the only member, so there is nothing to leave");
    }
    const user = await findUserById(db, auth.id);
    if (!user) {
      throw new ApiError(401, 'unauthenticated', 'This account no longer exists');
    }
    await leaveHousehold(db, auth.householdId, user.id);
    const newHouseholdId = await moveToNewHousehold(db, user);
    return getHousehold(db, newHouseholdId);
  });
}

/** Only the creator can remove others. The removed member gets a new empty household. */
export async function removeMember(
  pool: DatabasePool,
  auth: AuthenticatedUser,
  memberId: string
): Promise<void> {
  await withTransaction(pool, async (db) => {
    const household = await lockHousehold(db, auth.householdId);
    if (household?.createdBy !== auth.id) {
      throw new ApiError(403, 'not_creator', 'Only the person who created the household can remove members');
    }
    if (memberId === auth.id) {
      throw new ApiError(409, 'cannot_remove_self', 'To leave the household, use leave instead');
    }
    const member = await findUserById(db, memberId);
    // Someone in another household looks the same as someone who doesn't exist.
    if (member?.householdId !== auth.householdId) {
      throw new ApiError(404, 'member_not_found', 'This person is not a member of your household');
    }
    await leaveHousehold(db, auth.householdId, member.id);
    await moveToNewHousehold(db, member);
  });
}
