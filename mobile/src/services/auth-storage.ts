import * as SecureStore from 'expo-secure-store';

import type { Session, TokenPair } from '@/types/session';

/**
 * Where the login is kept between app starts. Services depend on this small interface, not on
 * expo-secure-store, so tests can use an in-memory version.
 */
export type AuthStorage = {
  getTokens(): Promise<TokenPair | null>;
  setTokens(tokens: TokenPair): Promise<void>;
  getSession(): Promise<Session | null>;
  setSession(session: Session): Promise<void>;
  clear(): Promise<void>;
};

// Keys may only contain letters, digits, ".", "-" and "_".
const Keys = {
  accessToken: 'auth.accessToken',
  refreshToken: 'auth.refreshToken',
  session: 'auth.session',
} as const;

/**
 * Keeps the login in the iOS Keychain or the Android Keystore, so other apps can't read the
 * tokens. Each value is stored on its own, because iOS can refuse values above about 2 KB.
 */
export function createSecureAuthStorage(): AuthStorage {
  return {
    async getTokens() {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(Keys.accessToken),
        SecureStore.getItemAsync(Keys.refreshToken),
      ]);
      return accessToken && refreshToken ? { accessToken, refreshToken } : null;
    },
    async setTokens(tokens) {
      await SecureStore.setItemAsync(Keys.accessToken, tokens.accessToken);
      await SecureStore.setItemAsync(Keys.refreshToken, tokens.refreshToken);
    },
    async getSession() {
      const json = await SecureStore.getItemAsync(Keys.session);
      return json ? (JSON.parse(json) as Session) : null;
    },
    async setSession(session) {
      await SecureStore.setItemAsync(Keys.session, JSON.stringify(session));
    },
    async clear() {
      await Promise.all(Object.values(Keys).map((key) => SecureStore.deleteItemAsync(key)));
    },
  };
}
