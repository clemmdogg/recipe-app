import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { logIn, logOut, refresh, signUp, type AuthContext } from '../services/auth.ts';
import {
  EmailSchema,
  ErrorSchema,
  HouseholdSummarySchema,
  NameSchema,
  PasswordSchema,
  TokenPairSchema,
  UserSchema,
} from './schemas.ts';

export type RateLimit = { max: number; timeWindow: string };

type AuthRoutesOptions = {
  auth: AuthContext;
  /** How often one IP address may call signup, login and refresh. */
  rateLimit: RateLimit;
};

const SignedInSchema = TokenPairSchema.extend({
  user: UserSchema,
  household: HouseholdSummarySchema,
});

const RefreshTokenBodySchema = z.object({ refreshToken: z.string().min(1) });

export const authRoutes: FastifyPluginAsyncZod<AuthRoutesOptions> = async (
  app,
  { auth, rateLimit }
) => {
  const limited = { rateLimit };

  app.post(
    '/auth/signup',
    {
      config: limited,
      schema: {
        summary: 'Create an account and an empty household',
        tags: ['Auth'],
        body: z.object({ email: EmailSchema, password: PasswordSchema, name: NameSchema }),
        response: { 201: SignedInSchema, 400: ErrorSchema, 409: ErrorSchema, 429: ErrorSchema },
      },
    },
    async (request, reply) => reply.code(201).send(await signUp(auth, request.body))
  );

  app.post(
    '/auth/login',
    {
      config: limited,
      schema: {
        summary: 'Log in with email and password',
        tags: ['Auth'],
        body: z.object({ email: EmailSchema, password: z.string().min(1).max(128) }),
        response: { 200: SignedInSchema, 400: ErrorSchema, 401: ErrorSchema, 429: ErrorSchema },
      },
    },
    async (request) => logIn(auth, request.body)
  );

  app.post(
    '/auth/refresh',
    {
      config: limited,
      schema: {
        summary: 'Swap a refresh token for a new access token and refresh token',
        tags: ['Auth'],
        body: RefreshTokenBodySchema,
        response: { 200: TokenPairSchema, 400: ErrorSchema, 401: ErrorSchema, 429: ErrorSchema },
      },
    },
    async (request) => refresh(auth, request.body.refreshToken)
  );

  app.post(
    '/auth/logout',
    {
      schema: {
        summary: 'Log out on this device',
        tags: ['Auth'],
        body: RefreshTokenBodySchema,
        response: { 204: z.null(), 400: ErrorSchema },
      },
    },
    async (request, reply) => {
      await logOut(auth, request.body.refreshToken);
      return reply.code(204).send(null);
    }
  );
};
