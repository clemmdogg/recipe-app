import { z } from 'zod';

/** The body of every error response. See "Errors" in api/docs/api-design.md. */
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * An error the client should see, with its HTTP status and a fixed code the app can check,
 * e.g. `new ApiError(409, 'email_taken', 'This email is already registered')`.
 * Services throw it, and the error handler turns it into the response.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
