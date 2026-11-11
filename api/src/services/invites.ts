import { withTransaction, isUniqueViolation, type Database, type DatabasePool } from '../db/database.ts';
import { ApiError } from '../errors.ts';
import { findHouseholdSummary, householdHasData } from '../repositories/households.ts';
import { findInvite, insertInvite, type StoredInvite } from '../repositories/invites.ts';
import { countMembers, moveUserToHousehold } from '../repositories/users.ts';
import {
  formatInviteCode,
  generateInviteCode,
  InviteLifetimeDays,
  normalizeInviteCode,
} from '../security/invite-codes.ts';
import type { AuthenticatedUser, Household, Invite, InvitePreview } from '../types/account.ts';
import { getHousehold } from './household.ts';
import { leaveHousehold } from './membership.ts';

/** Any member can invite others. The invite works for 7 days, for anyone who has the code. */
export async function createInvite(
  pool: DatabasePool,
  auth: AuthenticatedUser,
  linkBaseUrl: string,
  now = new Date()
): Promise<Invite> {
  const expiresAt = new Date(now.getTime() + InviteLifetimeDays * 24 * 60 * 60 * 1000);
  // A clash between two random codes is very unlikely, but cheap to handle.
  for (let attempt = 1; ; attempt++) {
    const code = generateInviteCode();
    try {
      await insertInvite(pool, { code, householdId: auth.householdId, createdBy: auth.id, expiresAt });
      const formatted = formatInviteCode(code);
      return { code: formatted, url: `${linkBaseUrl}/${formatted}`, expiresAt: expiresAt.toISOString() };
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === 3) {
        throw error;
      }
    }
  }
}

/** What the app shows before the user decides to join, including the data loss warning. */
export async function previewInvite(
  pool: DatabasePool,
  auth: AuthenticatedUser,
  code: string
): Promise<InvitePreview> {
  const invite = await findUsableInvite(pool, auth, code);
  const household = await findHouseholdSummary(pool, invite.householdId);
  return {
    householdName: household?.name ?? '',
    memberCount: await countMembers(pool, invite.householdId),
    expiresAt: invite.expiresAt.toISOString(),
    joiningDeletesData: await joiningDeletesData(pool, auth.householdId),
  };
}

/**
 * Moves the user to the invite's household. Their old household is tidied up like when
 * leaving: deleted if empty, or handed to the longest-standing member.
 */
export async function acceptInvite(
  pool: DatabasePool,
  auth: AuthenticatedUser,
  code: string,
  confirmDataLoss: boolean
): Promise<Household> {
  return withTransaction(pool, async (db) => {
    const invite = await findUsableInvite(db, auth, code);
    if (!confirmDataLoss && (await joiningDeletesData(db, auth.householdId))) {
      throw new ApiError(
        409,
        'data_loss_not_confirmed',
        "Joining deletes your current household's data. Send confirmDataLoss: true to go ahead."
      );
    }
    await leaveHousehold(db, auth.householdId, auth.id);
    await moveUserToHousehold(db, auth.id, invite.householdId);
    return getHousehold(db, invite.householdId);
  });
}

async function findUsableInvite(
  db: Database,
  auth: AuthenticatedUser,
  code: string
): Promise<StoredInvite> {
  const invite = await findInvite(db, normalizeInviteCode(code));
  if (!invite) {
    throw new ApiError(404, 'invite_not_found', 'There is no invite with this code');
  }
  if (invite.expiresAt <= new Date()) {
    throw new ApiError(410, 'invite_expired', 'This invite has expired. Ask for a new one.');
  }
  if (invite.householdId === auth.householdId) {
    throw new ApiError(409, 'already_member', "You're already a member of this household");
  }
  return invite;
}

/** The user is the only member of a household with data, so leaving it deletes that data. */
async function joiningDeletesData(db: Database, householdId: string): Promise<boolean> {
  return (await countMembers(db, householdId)) === 1 && (await householdHasData(db, householdId));
}
