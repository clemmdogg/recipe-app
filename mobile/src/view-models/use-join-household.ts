import { useState } from 'react';

import { acceptInvite, previewInvite } from '@/services/household';
import type { InvitePreview } from '@/types/household';
import { describeHouseholdError, NotUploadedError } from '@/view-models/household-errors';
import { useSession } from '@/view-models/session';
import { useSync } from '@/view-models/sync';

/**
 * "Join with code": look up the invite, show what joining means, then join. Everything on this
 * device is uploaded before looking up, so the server's data loss warning is accurate.
 */
export function useJoinHousehold() {
  const session = useSession();
  const syncing = useSync();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function run(action: () => Promise<void>): Promise<boolean> {
    if (isBusy) {
      return false;
    }
    setError(null);
    setIsBusy(true);
    try {
      await action();
      return true;
    } catch (caught) {
      setError(describeHouseholdError(caught));
      return false;
    } finally {
      setIsBusy(false);
    }
  }

  function changeCode(text: string): void {
    setCode(text);
    setPreview(null);
  }

  function lookUp(): Promise<boolean> {
    if (code.trim() === '') {
      setError('Enter the code from the invite.');
      return Promise.resolve(false);
    }
    return run(async () => {
      if (!(await syncing.uploadEverything())) {
        throw new NotUploadedError();
      }
      setPreview(await previewInvite(session.client, code.trim()));
    });
  }

  /** Returns true when joined, so the screen can close. */
  function join(): Promise<boolean> {
    return run(async () => {
      if (!preview) {
        return;
      }
      // The screen has shown the data loss warning when it applies, so this confirms it.
      const household = await acceptInvite(session.client, code.trim(), preview.joiningDeletesData);
      await session.updateHousehold({ id: household.id, name: household.name });
      // Replaces the local data with the new household's.
      await syncing.sync();
    });
  }

  return { code, changeCode, preview, error, isBusy, lookUp, join };
}
