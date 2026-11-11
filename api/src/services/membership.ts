import type { Database } from '../db/database.ts';
import { deleteHousehold, lockHousehold, setHouseholdCreator } from '../repositories/households.ts';
import { findLongestMember } from '../repositories/users.ts';

/**
 * Tidies up a household a user is about to leave, for any reason (deleting their account, and
 * later leaving, joining another household or being removed):
 * - if nobody else is left, the household and all its data are deleted
 * - if the user was the creator, the member who has been there the longest takes over
 *
 * Call it inside the same transaction that moves or deletes the user.
 */
export async function leaveHousehold(db: Database, householdId: string, userId: string): Promise<void> {
  const household = await lockHousehold(db, householdId);
  if (!household) {
    return;
  }
  const successor = await findLongestMember(db, householdId, userId);
  if (!successor) {
    await deleteHousehold(db, householdId);
    return;
  }
  if (household.createdBy === userId) {
    await setHouseholdCreator(db, householdId, successor);
  }
}
