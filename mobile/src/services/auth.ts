import type { ApiClient } from '@/services/api-client';
import type { AuthStorage } from '@/services/auth-storage';
import type { Session, TokenPair } from '@/types/session';

type SignedInResponse = Session & TokenPair;

export async function signUp(
  client: ApiClient,
  storage: AuthStorage,
  input: { email: string; password: string; name: string }
): Promise<Session> {
  const response = await client.request<SignedInResponse>('/v1/auth/signup', {
    method: 'POST',
    body: input,
    authenticated: false,
  });
  return keepSignedIn(storage, response);
}

export async function signIn(
  client: ApiClient,
  storage: AuthStorage,
  input: { email: string; password: string }
): Promise<Session> {
  const response = await client.request<SignedInResponse>('/v1/auth/login', {
    method: 'POST',
    body: input,
    authenticated: false,
  });
  return keepSignedIn(storage, response);
}

/**
 * Signs out on this device. The login is forgotten first, so this works offline too; telling the
 * server to revoke the refresh token is a bonus that may fail.
 */
export async function signOut(client: ApiClient, storage: AuthStorage): Promise<void> {
  const tokens = await storage.getTokens();
  await storage.clear();
  if (!tokens) {
    return;
  }
  try {
    await client.request('/v1/auth/logout', {
      method: 'POST',
      body: { refreshToken: tokens.refreshToken },
      authenticated: false,
    });
  } catch {
    // Offline or server down: the token expires on its own after 30 days.
  }
}

/** The login saved on this device, if any. Works offline, so the app opens without internet. */
export async function restoreSession(storage: AuthStorage): Promise<Session | null> {
  const [tokens, session] = await Promise.all([storage.getTokens(), storage.getSession()]);
  return tokens && session ? session : null;
}

async function keepSignedIn(storage: AuthStorage, response: SignedInResponse): Promise<Session> {
  const session: Session = { user: response.user, household: response.household };
  await storage.setTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });
  await storage.setSession(session);
  return session;
}
