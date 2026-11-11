import type { AuthStorage } from '@/services/auth-storage';
import type { TokenPair } from '@/types/session';

/** The API answered with an error, e.g. `401 invalid_credentials`. See api/docs/api-design.md. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

/** The API couldn't be reached: no internet, the server is down, or it took too long. */
export class NetworkError extends Error {
  constructor(message = "Can't reach the server") {
    super(message);
    this.name = 'NetworkError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Send the access token. Default true; false for sign-in, sign-up and token refresh. */
  authenticated?: boolean;
};

export type ApiClient = {
  /** Sends a request to our API and returns the JSON response (undefined for 204). */
  request<T>(path: string, options?: RequestOptions): Promise<T>;
};

type ApiClientOptions = {
  /** e.g. "http://192.168.1.20:3000" while developing. */
  baseUrl: string;
  storage: AuthStorage;
  /** Called when the login is no longer valid, so the app can show the sign-in screen. */
  onSessionExpired: () => void;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
};

type ErrorBody = { error?: { code?: string; message?: string } };

/**
 * The only place in the app that talks to our API. It adds the access token to every request,
 * and when the token has expired it gets a new pair with the refresh token and tries once more.
 */
export function createApiClient({
  baseUrl,
  storage,
  onSessionExpired,
  fetch = globalThis.fetch,
  timeoutMs = 15_000,
}: ApiClientOptions): ApiClient {
  // Several requests can find the token expired at once; they all wait for one refresh.
  let refreshing: Promise<TokenPair> | null = null;

  async function send(path: string, options: RequestOptions, accessToken?: string): Promise<Response> {
    if (!baseUrl) {
      throw new NetworkError('The API address is missing. Set EXPO_PUBLIC_API_URL in mobile/.env.local.');
    }
    const headers: Record<string, string> = {};
    if (options.body !== undefined) {
      headers['content-type'] = 'application/json';
    }
    if (accessToken) {
      headers.authorization = `Bearer ${accessToken}`;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch {
      throw new NetworkError();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function signOutLocally(): Promise<void> {
    await storage.clear();
    onSessionExpired();
  }

  async function refreshTokens(refreshToken: string): Promise<TokenPair> {
    const response = await send('/v1/auth/refresh', { method: 'POST', body: { refreshToken } });
    if (!response.ok) {
      const error = await toError(response);
      if (error.status === 401) {
        await signOutLocally();
      }
      throw error;
    }
    const tokens = (await response.json()) as TokenPair;
    await storage.setTokens(tokens);
    return tokens;
  }

  function refreshOnce(refreshToken: string): Promise<TokenPair> {
    refreshing ??= refreshTokens(refreshToken).finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  return {
    async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
      const authenticated = options.authenticated ?? true;
      const tokens = authenticated ? await storage.getTokens() : null;
      if (authenticated && !tokens) {
        await signOutLocally();
        throw new ApiRequestError(401, 'unauthenticated', 'Sign in first');
      }

      let response = await send(path, options, tokens?.accessToken);
      if (tokens && response.status === 401) {
        const error = await toError(response);
        if (error.code !== 'token_expired') {
          // The account is gone or the token is invalid: signing in again is the only way on.
          await signOutLocally();
          throw error;
        }
        const fresh = await refreshOnce(tokens.refreshToken);
        response = await send(path, options, fresh.accessToken);
      }

      if (!response.ok) {
        throw await toError(response);
      }
      return (response.status === 204 ? undefined : await response.json()) as T;
    },
  };
}

async function toError(response: Response): Promise<ApiRequestError> {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // Not JSON, e.g. an error page from a proxy.
  }
  return new ApiRequestError(
    response.status,
    body.error?.code ?? 'unknown_error',
    body.error?.message ?? `The server answered ${response.status}`
  );
}
