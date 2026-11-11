import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { DatabasePool } from '../db/database.ts';
import { requireAuth, type AuthenticateHook } from '../plugins/authenticate.ts';
import { pullChanges, pushChanges } from '../services/sync.ts';
import { PullResponseSchema, PushRequestSchema, PushResponseSchema } from '../types/sync.ts';
import { ErrorSchema, RequiresLogin } from './schemas.ts';

type ChangesRoutesOptions = {
  pool: DatabasePool;
  authenticate: AuthenticateHook;
};

const tags = ['Sync'];

/** 1000 recipes with long instructions are well over Fastify's default 1 MB limit. */
const PushBodyLimitBytes = 20 * 1024 * 1024;

export const changesRoutes: FastifyPluginAsyncZod<ChangesRoutesOptions> = async (
  app,
  { pool, authenticate }
) => {
  app.addHook('onRequest', authenticate);

  app.get(
    '/changes',
    {
      schema: {
        summary: 'Pull the changes made since the last sync',
        description:
          'Rows of all synced tables with a change number above `since`, oldest first. Deleted rows are included with deletedAt set.',
        tags,
        security: RequiresLogin,
        querystring: z.object({
          since: z.coerce.number().int().min(0).default(0).describe('The cursor from the previous pull. 0 for everything.'),
          limit: z.coerce.number().int().min(1).max(1000).default(500),
        }),
        response: { 200: PullResponseSchema, 400: ErrorSchema, 401: ErrorSchema },
      },
    },
    async (request) =>
      pullChanges(pool, requireAuth(request), request.query.since, request.query.limit)
  );

  app.post(
    '/changes',
    {
      bodyLimit: PushBodyLimitBytes,
      schema: {
        summary: 'Push the rows this device changed',
        description:
          'Saved all or nothing. Rows deleted on the server after this device last pulled them are rejected (a delete beats an edit). Pull afterwards.',
        tags,
        security: RequiresLogin,
        body: PushRequestSchema,
        response: { 200: PushResponseSchema, 400: ErrorSchema, 401: ErrorSchema },
      },
    },
    async (request) => pushChanges(pool, requireAuth(request), request.body.changes)
  );
};
