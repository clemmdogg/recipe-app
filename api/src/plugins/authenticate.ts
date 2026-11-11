import type { FastifyInstance, FastifyRequest } from 'fastify';

import { ApiError } from '../errors.ts';
import { authenticate, type AuthContext } from '../services/auth.ts';
import type { AuthenticatedUser } from '../types/account.ts';

declare module 'fastify' {
  interface FastifyRequest {
    /** The logged-in user, set by the authenticate hook. `null` on routes without it. */
    auth: AuthenticatedUser | null;
  }
}

/** A hook that rejects the request with 401 unless it has a valid access token. */
export type AuthenticateHook = (request: FastifyRequest) => Promise<void>;

export function registerAuthentication(app: FastifyInstance, auth: AuthContext): AuthenticateHook {
  app.decorateRequest('auth', null);

  return async (request) => {
    const match = /^Bearer (\S+)$/i.exec(request.headers.authorization ?? '');
    if (!match?.[1]) {
      throw new ApiError(401, 'unauthenticated', 'Send an access token: Authorization: Bearer <token>');
    }
    request.auth = await authenticate(auth, match[1]);
  };
}

/** The logged-in user on a route that uses the authenticate hook. */
export function requireAuth(request: FastifyRequest): AuthenticatedUser {
  if (!request.auth) {
    throw new Error(`${request.method} ${request.url} is missing the authenticate hook`);
  }
  return request.auth;
}
