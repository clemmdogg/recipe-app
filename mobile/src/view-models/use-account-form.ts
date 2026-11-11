import { useState } from 'react';

import { renameHousehold } from '@/services/household';
import { describeHouseholdError, InputError } from '@/view-models/household-errors';
import { useSession } from '@/view-models/session';

/** State shared by the small one-field forms in the Household tab. */
function useOneFieldForm(initialValue: string, submitValue: (value: string) => Promise<void>) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  /** Returns true when done, so the screen can close. */
  async function submit(): Promise<boolean> {
    if (isBusy) {
      return false;
    }
    setError(null);
    setIsBusy(true);
    try {
      await submitValue(value);
      return true;
    } catch (caught) {
      setError(describeHouseholdError(caught));
      setIsBusy(false);
      return false;
    }
  }

  return { value, setValue, error, setError, isBusy, submit };
}

export function useRenameHousehold() {
  const session = useSession();
  return useOneFieldForm(session.session?.household.name ?? '', async (name) => {
    const trimmed = name.trim();
    if (trimmed === '') {
      throw new InputError('Enter a name for your household.');
    }
    const household = await renameHousehold(session.client, trimmed);
    await session.updateHousehold({ id: household.id, name: household.name });
  });
}

/** Deleting the account asks for the password again. Signs out when done. */
export function useDeleteAccount() {
  const session = useSession();
  return useOneFieldForm('', async (password) => {
    if (password === '') {
      throw new InputError('Enter your password to confirm.');
    }
    await session.deleteAccount(password);
  });
}
