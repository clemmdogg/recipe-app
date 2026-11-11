import { createMemoryAuthStorage } from '../../jest/memory-auth-storage';

import { ApiRequestError, NetworkError, type ApiClient } from '@/services/api-client';
import { restoreSession, signIn, signOut } from '@/services/auth';
import { describeAuthError } from '@/view-models/auth-errors';
import { checkFields } from '@/view-models/use-auth-form';

const session = {
  user: { id: 'u1', email: 'anna@example.com', name: 'Anna' },
  household: { id: 'h1', name: "Anna's household" },
};
const tokens = { accessToken: 'access', refreshToken: 'refresh' };

function fakeClient(respond: (path: string) => unknown): ApiClient & { paths: string[] } {
  const paths: string[] = [];
  return {
    paths,
    request: async <T,>(path: string) => {
      paths.push(path);
      return respond(path) as T;
    },
  };
}

describe('signIn', () => {
  it('keeps the tokens and session on the device', async () => {
    const storage = createMemoryAuthStorage();
    const client = fakeClient(() => ({ ...session, ...tokens }));

    await expect(signIn(client, storage, { email: 'anna@example.com', password: 'secret' })).resolves.toEqual(
      session
    );
    expect(await storage.getTokens()).toEqual(tokens);
    expect(await restoreSession(storage)).toEqual(session);
  });
});

describe('signOut', () => {
  it('forgets the login even when the server can not be reached', async () => {
    const storage = createMemoryAuthStorage({ tokens, session });
    const client = fakeClient(() => {
      throw new NetworkError();
    });

    await signOut(client, storage);

    expect(client.paths).toEqual(['/v1/auth/logout']);
    expect(await restoreSession(storage)).toBeNull();
  });
});

describe('restoreSession', () => {
  it('needs both tokens and the session', async () => {
    await expect(restoreSession(createMemoryAuthStorage({ session }))).resolves.toBeNull();
    await expect(restoreSession(createMemoryAuthStorage({ tokens, session }))).resolves.toEqual(session);
  });
});

describe('checkFields', () => {
  const valid = { name: 'Anna', email: 'anna@example.com', password: 'long enough' };

  it('accepts valid details', () => {
    expect(checkFields('signUp', valid)).toBeNull();
    expect(checkFields('signIn', { ...valid, name: '' })).toBeNull();
  });

  it('asks for a name, a valid email and a long enough password when signing up', () => {
    expect(checkFields('signUp', { ...valid, name: '  ' })).toMatch(/name/);
    expect(checkFields('signUp', { ...valid, email: 'anna@' })).toMatch(/email/);
    expect(checkFields('signUp', { ...valid, password: 'short' })).toMatch(/8 characters/);
  });

  it('only asks for some password when signing in', () => {
    expect(checkFields('signIn', { ...valid, password: 'short' })).toBeNull();
    expect(checkFields('signIn', { ...valid, password: '' })).toMatch(/password/);
  });
});

describe('describeAuthError', () => {
  it('explains the errors people can do something about', () => {
    expect(describeAuthError(new ApiRequestError(401, 'invalid_credentials', ''))).toBe('Wrong email or password.');
    expect(describeAuthError(new ApiRequestError(409, 'email_taken', ''))).toMatch(/already exists/);
    expect(describeAuthError(new NetworkError())).toMatch(/internet connection/);
    expect(describeAuthError(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});
