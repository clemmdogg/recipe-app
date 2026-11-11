import { useAsyncResource } from '@/hooks/use-async-resource';
import { useReloadOnRefocus } from '@/hooks/use-reload-on-refocus';
import { createInvite, getHousehold, leaveHousehold, removeMember } from '@/services/household';
import type { Invite } from '@/types/household';
import { NotUploadedError } from '@/view-models/household-errors';
import { useSession } from '@/view-models/session';
import { useReloadOnSync, useSync } from '@/view-models/sync';

/**
 * The Household tab: the household and its members from the server, the sync status, and the
 * actions on them. Confirmations and the share sheet are up to the screen.
 */
export function useHousehold() {
  const session = useSession();
  const syncing = useSync();
  const householdId = session.session?.household.id ?? null;
  const household = useAsyncResource(householdId && `household:${householdId}`, () =>
    getHousehold(session.client)
  );
  useReloadOnRefocus(household.reload);
  useReloadOnSync(household.reload);

  const userId = session.session?.user.id;
  const isCreator = household.data !== undefined && household.data.createdBy === userId;

  /** Uploads everything, then moves to a new empty household. */
  async function leave(): Promise<void> {
    if (!(await syncing.uploadEverything())) {
      throw new NotUploadedError();
    }
    const newHousehold = await leaveHousehold(session.client);
    await session.updateHousehold({ id: newHousehold.id, name: newHousehold.name });
    await syncing.sync();
  }

  async function remove(memberId: string): Promise<void> {
    await removeMember(session.client, memberId);
    household.reload();
  }

  /** Whether signing out now would lose changes: tries to upload them first. */
  async function hasUnsyncedChanges(): Promise<boolean> {
    return !(await syncing.uploadEverything());
  }

  return {
    session: session.session,
    household,
    isCreator,
    userId,
    syncStatus: syncing.status,
    lastSyncedAt: syncing.lastSyncedAt,
    sync: syncing.sync,
    invite: (): Promise<Invite> => createInvite(session.client),
    leave,
    remove,
    hasUnsyncedChanges,
    signOut: session.signOut,
  };
}
