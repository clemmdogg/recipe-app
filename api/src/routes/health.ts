import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Database } from '../db/database.ts';
import { getHealth } from '../services/health.ts';

const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'database_unavailable']),
});

type HealthRoutesOptions = { db: Database };

export const healthRoutes: FastifyPluginAsyncZod<HealthRoutesOptions> = async (app, { db }) => {
  app.get(
    '/health',
    {
      schema: {
        summary: 'Is the API running and can it reach the database?',
        tags: ['Health'],
        response: { 200: HealthResponseSchema, 503: HealthResponseSchema },
      },
    },
    async (_request, reply) => {
      const status = await getHealth(db);
      return reply.code(status === 'ok' ? 200 : 503).send({ status });
    }
  );
};
