import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

import { ApiError, type ErrorResponse } from '../errors.ts';

/** Sends every error in the same shape, and never sends stack traces or internal details. */
export function registerErrorHandlers(app: FastifyInstance): void {
  app.setErrorHandler(handleError);
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send(errorBody('not_found', `${request.method} ${request.url} does not exist`));
  });
}

function handleError(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof ApiError) {
    return reply.code(error.statusCode).send(errorBody(error.code, error.message));
  }

  if (hasZodFastifySchemaValidationErrors(error)) {
    const details = error.validation.map((issue) => ({
      path: `${error.validationContext ?? ''}${issue.instancePath}`,
      message: issue.message ?? 'Invalid value',
    }));
    return reply.code(400).send(errorBody('validation_failed', error.message, details));
  }

  // Errors Fastify itself raises for bad requests, e.g. a body that isn't valid JSON.
  const statusCode = error.statusCode ?? 500;
  if (statusCode < 500) {
    return reply.code(statusCode).send(errorBody('bad_request', error.message));
  }

  request.log.error(error);
  return reply.code(500).send(errorBody('internal_error', 'Something went wrong on the server'));
}

function errorBody(
  code: string,
  message: string,
  details?: ErrorResponse['error']['details']
): ErrorResponse {
  return { error: { code, message, details } };
}
