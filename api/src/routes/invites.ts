import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { DatabasePool } from '../db/database.ts';
import { requireAuth, type AuthenticateHook } from '../plugins/authenticate.ts';
import { acceptInvite, previewInvite } from '../services/invites.ts';
import type { RateLimit } from './auth.ts';
import { ErrorSchema, HouseholdSchema, RequiresLogin } from './schemas.ts';

type InviteRoutesOptions = {
  pool: DatabasePool;
  authenticate: AuthenticateHook;
  /** Limits guessing invite codes. */
  rateLimit: RateLimit;
};

/** Typed by people, so any letter case and with or without the dash. */
const CodeParamsSchema = z.object({ code: z.string().min(1).max(20) });

const tags = ['Invites'];

export const inviteRoutes: FastifyPluginAsyncZod<InviteRoutesOptions> = async (
  app,
  { pool, authenticate, rateLimit }
) => {
  app.addHook('onRequest', authenticate);

  app.get(
    '/invites/:code',
    {
      config: { rateLimit },
      schema: {
        summary: 'Preview an invite before joining',
        tags,
        security: RequiresLogin,
        params: CodeParamsSchema,
        response: {
          200: z.object({
            householdName: z.string(),
            memberCount: z.number().int(),
            expiresAt: z.iso.datetime(),
            joiningDeletesData: z.boolean(),
          }),
          401: ErrorSchema,
          404: ErrorSchema,
          409: ErrorSchema,
          410: ErrorSchema,
          429: ErrorSchema,
        },
      },
    },
    async (request) => previewInvite(pool, requireAuth(request), request.params.code)
  );

  app.post(
    '/invites/:code/accept',
    {
      config: { rateLimit },
      schema: {
        summary: "Join the invite's household",
        description:
          'If the user is the only member of a household with data, that data is deleted, so confirmDataLoss must be true.',
        tags,
        security: RequiresLogin,
        params: CodeParamsSchema,
        // Optional: Fastify passes null when the request has no body.
        body: z.object({ confirmDataLoss: z.boolean().optional() }).nullish(),
        response: {
          200: HouseholdSchema,
          400: ErrorSchema,
          401: ErrorSchema,
          404: ErrorSchema,
          409: ErrorSchema,
          410: ErrorSchema,
          429: ErrorSchema,
        },
      },
    },
    async (request) =>
      acceptInvite(
        pool,
        requireAuth(request),
        request.params.code,
        request.body?.confirmDataLoss ?? false
      )
  );
};
