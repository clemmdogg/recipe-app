import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { useDatabase } from '@/db/use-database';
import { clearHouseholdData } from '@/repositories/local-data';
import { createApiClient, type ApiClient } from '@/services/api-client';
import { createSecureAuthStorage, type AuthStorage } from '@/services/auth-storage';
import { restoreSession, signIn, signOut, signUp } from '@/services/auth';
import { deleteAccount } from '@/services/household';
import type { Session } from '@/types/session';

type SessionContextValue = {
  /** null when signed out. */
  session: Session | null;
  /** True while the saved login is being read at app start. */
  isLoading: boolean;
  /** For services that call the API, e.g. sync and household. */
  client: ApiClient;
  signIn(input: { email: string; password: string }): Promise<void>;
  signUp(input: { email: string; password: string; name: string }): Promise<void>;
  /** Signs out and deletes the household data from this device. Warn about unsynced changes first. */
  signOut(): Promise<void>;
  /** Deletes the account on the server, then signs out like `signOut`. */
  deleteAccount(password: string): Promise<void>;
  /** After joining, leaving or being removed: remember the user's new household. */
  updateHousehold(household: Session['household']): Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Holds the login for the whole app. The root layout shows the sign-in screens while `session`
 * is null and the tabs once it isn't.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const db = useDatabase();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storage] = useState<AuthStorage>(createSecureAuthStorage);
  const [client] = useState<ApiClient>(() =>
    createApiClient({
      baseUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
      storage,
      onSessionExpired: () => setSession(null),
    })
  );

  // Read the saved login once at start. It is on the device, so this works offline.
  useEffect(() => {
    let isCurrent = true;
    restoreSession(storage)
      .catch(() => null)
      .then((restored) => {
        if (isCurrent) {
          setSession(restored);
          setIsLoading(false);
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [storage]);

  const value: SessionContextValue = {
    session,
    isLoading,
    client,
    signIn: async (input) => setSession(await signIn(client, storage, input)),
    signUp: async (input) => setSession(await signUp(client, storage, input)),
    signOut: async () => {
      await signOut(client, storage);
      await clearHouseholdData(db);
      setSession(null);
    },
    deleteAccount: async (password) => {
      await deleteAccount(client, password);
      await storage.clear();
      await clearHouseholdData(db);
      setSession(null);
    },
    updateHousehold: async (household) => {
      if (!session) {
        return;
      }
      const updated = { ...session, household };
      await storage.setSession(updated);
      setSession(updated);
    },
  };

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const value = use(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return value;
}
