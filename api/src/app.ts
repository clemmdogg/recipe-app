import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyServerOptions } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import type { Database } from './db/database.ts';
import { registerErrorHandlers } from './plugins/error-handler.ts';
import { healthRoutes } from './routes/health.ts';

export type AppOptions = {
  /** Where the API reads and writes data. Tests pass a test database. */
  db: Database;
  logger?: FastifyServerOptions['logger'];
};

/**
 * Builds the API without starting it. `server.ts` starts it, and tests call `app.inject()`
 * to send requests without opening a network port.
 */
export async function buildApp({ db, logger = false }: AppOptions) {
  const app = Fastify({ logger }).withTypeProvider<ZodTypeProvider>();

  // Zod checks every request against its route's schema, and every response too.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandlers(app);

  // Interactive API documentation at /documentation, generated from the routes' Zod schemas.
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Recipe App API',
        description: 'Accounts, households and sync for the recipe app.',
        version: '1.0.0',
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(fastifySwaggerUi, { routePrefix: '/documentation' });

  await app.register(healthRoutes, { prefix: '/v1', db });

  return app;
}
