import { createMemoryAuthStorage } from '../../jest/memory-auth-storage';

import { ApiRequestError, createApiClient, NetworkError } from '@/services/api-client';

const BaseUrl = 'http://api.test';
const oldTokens = { accessToken: 'old-access', refreshToken: 'old-refresh' };
const newTokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };

function json(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function errorResponse(status: number, code: string): Response {
  return json(status, { error: { code, message: code } });
}

/** A fake server: the handler gets each request and returns the response. */
function setup(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const storage = createMemoryAuthStorage({ tokens: oldTokens });
  const onSessionExpired = jest.fn();
  const requests: { url: string; authorization?: string; body?: unknown }[] = [];
  const fetch = jest.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const headers = init.headers as Record<string, string>;
    requests.push({
      url,
      authorization: headers.authorization,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    return handler(url, init);
  });
  const client = createApiClient({ baseUrl: BaseUrl, storage, onSessionExpired, fetch });
  return { client, storage, onSessionExpired, requests };
}

describe('createApiClient', () => {
  it('sends the access token and returns the JSON body', async () => {
    const { client, requests } = setup(() => json(200, { name: 'The Jensens' }));

    await expect(client.request('/v1/household')).resolves.toEqual({ name: 'The Jensens' });
    expect(requests).toEqual([
      { url: `${BaseUrl}/v1/household`, authorization: 'Bearer old-access', body: undefined },
    ]);
  });

  it('refreshes an expired token once and repeats the request', async () => {
    const { client, storage, requests } = setup((url, init) => {
      if (url.endsWith('/v1/auth/refresh')) {
        return json(200, newTokens);
      }
      const authorization = (init.headers as Record<string, string>).authorization;
      return authorization === 'Bearer new-access' ? json(200, { ok: true }) : errorResponse(401, 'token_expired');
    });

    await expect(client.request('/v1/me')).resolves.toEqual({ ok: true });
    expect(requests.map((request) => request.url)).toEqual([
      `${BaseUrl}/v1/me`,
      `${BaseUrl}/v1/auth/refresh`,
      `${BaseUrl}/v1/me`,
    ]);
    expect(requests[1]!.body).toEqual({ refreshToken: 'old-refresh' });
    expect(await storage.getTokens()).toEqual(newTokens);
  });

  it('refreshes only once when several requests find the token expired', async () => {
    const { client, requests } = setup((url, init) => {
      if (url.endsWith('/v1/auth/refresh')) {
        return json(200, newTokens);
      }
      const authorization = (init.headers as Record<string, string>).authorization;
      return authorization === 'Bearer new-access' ? json(200, {}) : errorResponse(401, 'token_expired');
    });

    await Promise.all([client.request('/v1/me'), client.request('/v1/household')]);

    expect(requests.filter((request) => request.url.endsWith('/refresh'))).toHaveLength(1);
  });

  it('signs out when the refresh token is no longer valid', async () => {
    const { client, storage, onSessionExpired } = setup((url) =>
      url.endsWith('/v1/auth/refresh')
        ? errorResponse(401, 'invalid_refresh_token')
        : errorResponse(401, 'token_expired')
    );

    await expect(client.request('/v1/me')).rejects.toMatchObject({ code: 'invalid_refresh_token' });
    expect(onSessionExpired).toHaveBeenCalled();
    expect(await storage.getTokens()).toBeNull();
  });

  it('signs out when the account no longer exists', async () => {
    const { client, onSessionExpired } = setup(() => errorResponse(401, 'unauthenticated'));

    await expect(client.request('/v1/me')).rejects.toBeInstanceOf(ApiRequestError);
    expect(onSessionExpired).toHaveBeenCalled();
  });

  it('stays signed in when the server can not be reached', async () => {
    const { client, storage, onSessionExpired } = setup(() => {
      throw new TypeError('Network request failed');
    });

    await expect(client.request('/v1/me')).rejects.toBeInstanceOf(NetworkError);
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(await storage.getTokens()).toEqual(oldTokens);
  });

  it('turns error responses into ApiRequestError with the code', async () => {
    const { client } = setup(() => errorResponse(409, 'email_taken'));

    await expect(
      client.request('/v1/auth/signup', { method: 'POST', body: {}, authenticated: false })
    ).rejects.toMatchObject({ status: 409, code: 'email_taken' });
  });

  it('returns undefined for 204 No Content', async () => {
    const { client } = setup(() => json(204));

    await expect(client.request('/v1/auth/logout', { method: 'POST', authenticated: false })).resolves.toBeUndefined();
  });
});
