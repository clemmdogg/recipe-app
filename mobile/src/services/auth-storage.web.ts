import type { AuthStorage } from '@/services/auth-storage';
import type { Session, TokenPair } from '@/types/session';

/*
 * The browser version of auth-storage.ts. Browsers have no keychain, so the login is kept in
 * localStorage, as Expo's own authentication guide does on the web.
 *
 * Trade-off (decided with the student): JavaScript running on the page can read localStorage, so
 * an XSS bug could leak the tokens. The app never renders HTML from users, and access tokens only
 * last 15 minutes, so the risk is low. httpOnly cookies would be safer but need CSRF protection
 * and bigger API changes.
 */

const Keys = {
  accessToken: 'auth.accessToken',
  refreshToken: 'auth.refreshToken',
  session: 'auth.session',
} as const;

// localStorage can throw, e.g. in private browsing with storage blocked. Then the login simply
// isn't remembered after closing the tab.
function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // See above.
  }
}

export function createAuthStorage(): AuthStorage {
  return {
    async getTokens(): Promise<TokenPair | null> {
      const accessToken = read(Keys.accessToken);
      const refreshToken = read(Keys.refreshToken);
      return accessToken && refreshToken ? { accessToken, refreshToken } : null;
    },
    async setTokens(tokens) {
      write(Keys.accessToken, tokens.accessToken);
      write(Keys.refreshToken, tokens.refreshToken);
    },
    async getSession(): Promise<Session | null> {
      const json = read(Keys.session);
      return json ? (JSON.parse(json) as Session) : null;
    },
    async setSession(session) {
      write(Keys.session, JSON.stringify(session));
    },
    async clear() {
      for (const key of Object.values(Keys)) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // See above.
        }
      }
    },
  };
}
