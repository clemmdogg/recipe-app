import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { DatabasePool } from '../db/database.ts';
import { requireAuth, type AuthenticateHook } from '../plugins/authenticate.ts';
import { deleteAccount, getAccount } from '../services/account.ts';
import { ErrorSchema, HouseholdSummarySchema, RequiresLogin, UserSchema } from './schemas.ts';

type MeRoutesOptions = {
  pool: DatabasePool;
  authenticate: AuthenticateHook;
};

export const meRoutes: FastifyPluginAsyncZod<MeRoutesOptions> = async (
  app,
  { pool, authenticate }
) => {
  app.addHook('onRequest', authenticate);

  app.get(
    '/me',
    {
      schema: {
        summary: 'The logged-in user and their household',
        tags: ['Account'],
        security: RequiresLogin,
        response: {
          200: z.object({ user: UserSchema, household: HouseholdSummarySchema }),
          401: ErrorSchema,
        },
      },
    },
    async (request) => getAccount(pool, requireAuth(request).id)
  );

  app.delete(
    '/me',
    {
      schema: {
        summary: 'Delete the account for good',
        description:
          'Asks for the password again. If the user was the last member, the household and its data are deleted too.',
        tags: ['Account'],
        security: RequiresLogin,
        body: z.object({ password: z.string().min(1).max(128) }),
        response: { 204: z.null(), 400: ErrorSchema, 401: ErrorSchema, 403: ErrorSchema },
      },
    },
    async (request, reply) => {
      await deleteAccount(pool, requireAuth(request).id, request.body.password);
      return reply.code(204).send(null);
    }
  );
};
