import type { AuthStorage } from '@/services/auth-storage';
import type { Session, TokenPair } from '@/types/session';

/** An AuthStorage kept in memory, for tests. jest-expo mocks expo-secure-store to do nothing. */
export function createMemoryAuthStorage(initial: { tokens?: TokenPair; session?: Session } = {}) {
  let tokens = initial.tokens ?? null;
  let session = initial.session ?? null;
  const storage: AuthStorage = {
    getTokens: async () => tokens,
    setTokens: async (value) => {
      tokens = value;
    },
    getSession: async () => session,
    setSession: async (value) => {
      session = value;
    },
    clear: async () => {
      tokens = null;
      session = null;
    },
  };
  return storage;
}
