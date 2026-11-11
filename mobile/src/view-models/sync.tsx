import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/db/use-database';
import { hasRowsToPush } from '@/repositories/sync';
import { NetworkError } from '@/services/api-client';
import { getAccount } from '@/services/household';
import { syncNow } from '@/services/sync';
import { useSession } from '@/view-models/session';

/** How often to look for local changes to upload while the app is open. */
const PushCheckIntervalMs = 5_000;
/** How often to fetch family members' changes while the app is open. */
const PullIntervalMs = 60_000;

export type SyncStatus =
  | { state: 'idle' }
  | { state: 'syncing' }
  | { state: 'offline' }
  | { state: 'error'; message: string };

type SyncContextValue = {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  /** Goes up every time a sync saves rows from other devices; screens reload on it. */
  dataVersion: number;
  /** Syncs now, unless a sync is already running. */
  sync(): Promise<void>;
  /** Syncs, then tells whether all of this device's changes are uploaded (false when offline). */
  uploadEverything(): Promise<boolean>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

/**
 * Keeps this device in step with the household while signed in. It syncs when the app opens or
 * comes back to the front, a few seconds after a local change, and every minute for others'
 * changes. Screens don't call it: they keep reading and writing the local database.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const db = useDatabase();
  const { client, session, updateHousehold } = useSession();
  const [status, setStatus] = useState<SyncStatus>({ state: 'idle' });
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const running = useRef<Promise<void> | null>(null);

  function sync(): Promise<void> {
    running.current ??= runSync().finally(() => {
      running.current = null;
    });
    return running.current;
  }

  async function uploadEverything(): Promise<boolean> {
    await sync();
    return !(await hasRowsToPush(db));
  }

  async function runSync(): Promise<void> {
    setStatus({ state: 'syncing' });
    try {
      // Ask the server which household the user is in now: they may have joined another one on
      // another device, or been removed. syncNow then replaces the local data if it changed.
      const account = await getAccount(client);
      const household = account.household;
      if (household.id !== session?.household.id || household.name !== session.household.name) {
        await updateHousehold(household);
      }
      const result = await syncNow(db, client, household.id);
      if (result.pulled > 0 || result.switchedHousehold) {
        setDataVersion((version) => version + 1);
      }
      setLastSyncedAt(new Date());
      setStatus({ state: 'idle' });
    } catch (error) {
      setStatus(
        error instanceof NetworkError
          ? { state: 'offline' }
          : { state: 'error', message: error instanceof Error ? error.message : 'Sync failed' }
      );
    }
  }

  // Lets the timers below, which are set up only once, always call the latest `sync`.
  const syncFromTimer = useEffectEvent(() => {
    sync();
  });

  useEffect(() => {
    syncFromTimer();

    const pushCheck = setInterval(() => {
      if (AppState.currentState !== 'active') {
        return;
      }
      hasRowsToPush(db)
        .then((pending) => pending && syncFromTimer())
        .catch(() => undefined);
    }, PushCheckIntervalMs);
    const pull = setInterval(() => {
      if (AppState.currentState === 'active') {
        syncFromTimer();
      }
    }, PullIntervalMs);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncFromTimer();
      }
    });

    return () => {
      clearInterval(pushCheck);
      clearInterval(pull);
      appState.remove();
    };
  }, [db]);

  return (
    <SyncContext value={{ status, lastSyncedAt, dataVersion, sync, uploadEverything }}>
      {children}
    </SyncContext>
  );
}

export function useSync(): SyncContextValue {
  const value = use(SyncContext);
  if (!value) {
    throw new Error('useSync must be used inside SyncProvider');
  }
  return value;
}

/**
 * Calls `reload` when a sync brings in changes from other devices, so the screen shows them.
 * Skips the first render, when the data is already loading. Does nothing outside SyncProvider.
 */
export function useReloadOnSync(reload: () => void): void {
  const dataVersion = use(SyncContext)?.dataVersion ?? 0;
  const seen = useRef(dataVersion);

  useEffect(() => {
    if (seen.current !== dataVersion) {
      seen.current = dataVersion;
      reload();
    }
  }, [dataVersion, reload]);
}
