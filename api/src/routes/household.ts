import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { DatabasePool } from '../db/database.ts';
import { requireAuth, type AuthenticateHook } from '../plugins/authenticate.ts';
import { getHousehold, leave, removeMember, rename } from '../services/household.ts';
import { createInvite } from '../services/invites.ts';
import { ErrorSchema, HouseholdSchema, NameSchema, RequiresLogin } from './schemas.ts';

type HouseholdRoutesOptions = {
  pool: DatabasePool;
  authenticate: AuthenticateHook;
  /** Invite links are `${inviteLinkBaseUrl}/${code}`. */
  inviteLinkBaseUrl: string;
};

const tags = ['Household'];

export const householdRoutes: FastifyPluginAsyncZod<HouseholdRoutesOptions> = async (
  app,
  { pool, authenticate, inviteLinkBaseUrl }
) => {
  app.addHook('onRequest', authenticate);

  app.get(
    '/household',
    {
      schema: {
        summary: "The user's household and its members",
        tags,
        security: RequiresLogin,
        response: { 200: HouseholdSchema, 401: ErrorSchema },
      },
    },
    async (request) => getHousehold(pool, requireAuth(request).householdId)
  );

  app.patch(
    '/household',
    {
      schema: {
        summary: 'Rename the household',
        tags,
        security: RequiresLogin,
        body: z.object({ name: NameSchema }),
        response: { 200: HouseholdSchema, 400: ErrorSchema, 401: ErrorSchema },
      },
    },
    async (request) => rename(pool, requireAuth(request), request.body.name)
  );

  app.post(
    '/household/invites',
    {
      schema: {
        summary: 'Create an invite link that works for 7 days',
        tags,
        security: RequiresLogin,
        response: {
          201: z.object({ code: z.string(), url: z.string(), expiresAt: z.iso.datetime() }),
          401: ErrorSchema,
        },
      },
    },
    async (request, reply) =>
      reply.code(201).send(await createInvite(pool, requireAuth(request), inviteLinkBaseUrl))
  );

  app.post(
    '/household/leave',
    {
      schema: {
        summary: 'Leave the household and get a new empty one',
        tags,
        security: RequiresLogin,
        response: { 200: HouseholdSchema, 401: ErrorSchema, 409: ErrorSchema },
      },
    },
    async (request) => leave(pool, requireAuth(request))
  );

  app.delete(
    '/household/members/:userId',
    {
      schema: {
        summary: 'Remove a member (creator only)',
        tags,
        security: RequiresLogin,
        params: z.object({ userId: z.uuid() }),
        response: {
          204: z.null(),
          400: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
          409: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      await removeMember(pool, requireAuth(request), request.params.userId);
      return reply.code(204).send(null);
    }
  );
};
