import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyServerOptions } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import type { DatabasePool } from './db/database.ts';
import { registerAuthentication } from './plugins/authenticate.ts';
import { registerErrorHandlers } from './plugins/error-handler.ts';
import { createAccessTokenKey } from './security/access-tokens.ts';
import { authRoutes, type RateLimit } from './routes/auth.ts';
import { healthRoutes } from './routes/health.ts';
import { householdRoutes } from './routes/household.ts';
import { inviteRoutes } from './routes/invites.ts';
import { meRoutes } from './routes/me.ts';

export type AppOptions = {
  /** Where the API reads and writes data. Tests pass the test database. */
  pool: DatabasePool;
  /** Signs and checks access tokens (JWT_SECRET). */
  accessTokenSecret: string;
  /** Limit for signup, login and refresh per IP address. Tests raise it. */
  authRateLimit?: RateLimit;
  /** Behind Caddy on the server: read the phone's real IP address from the proxy headers. */
  trustProxy?: boolean;
  /** Invite links are `${inviteLinkBaseUrl}/${code}`. */
  inviteLinkBaseUrl?: string;
  logger?: FastifyServerOptions['logger'];
};

/**
 * Builds the API without starting it. `server.ts` starts it, and tests call `app.inject()`
 * to send requests without opening a network port.
 */
export async function buildApp({
  pool,
  accessTokenSecret,
  authRateLimit = { max: 10, timeWindow: '1 minute' },
  trustProxy = false,
  inviteLinkBaseUrl = 'http://localhost:3000/join',
  logger = false,
}: AppOptions) {
  const app = Fastify({ logger, trustProxy }).withTypeProvider<ZodTypeProvider>();

  // Zod checks every request against its route's schema, and every response too.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandlers(app);

  // Off by default; only routes with `config.rateLimit` are limited.
  await app.register(fastifyRateLimit, { global: false });

  // Interactive API documentation at /documentation, generated from the routes' Zod schemas.
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Recipe App API',
        description: 'Accounts, households and sync for the recipe app.',
        version: '1.0.0',
      },
      components: {
        securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(fastifySwaggerUi, { routePrefix: '/documentation' });

  const auth = { pool, accessTokenKey: createAccessTokenKey(accessTokenSecret) };
  const authenticate = registerAuthentication(app, auth);

  await app.register(healthRoutes, { prefix: '/v1', db: pool });
  await app.register(authRoutes, { prefix: '/v1', auth, rateLimit: authRateLimit });
  await app.register(meRoutes, { prefix: '/v1', pool, authenticate });
  await app.register(householdRoutes, { prefix: '/v1', pool, authenticate, inviteLinkBaseUrl });
  await app.register(inviteRoutes, { prefix: '/v1', pool, authenticate, rateLimit: authRateLimit });

  return app;
}
