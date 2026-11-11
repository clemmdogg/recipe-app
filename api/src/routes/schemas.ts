import { z } from 'zod';

import { ErrorResponseSchema } from '../errors.ts';

/** Stored in lowercase, so "Anna@Example.com" and "anna@example.com" are the same account. */
export const EmailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

/** 8 to 128 characters and no other rules, following current password guidance (NIST). */
export const PasswordSchema = z.string().min(8).max(128);

/** A person's or household's name, shown to the other members. */
export const NameSchema = z.string().trim().min(1).max(50);

export const UserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  name: z.string(),
});

export const HouseholdSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

export const HouseholdSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  createdBy: z.uuid(),
  members: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      joinedAt: z.iso.datetime(),
      isCreator: z.boolean(),
    })
  ),
});

export const TokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

/** Every error response, for the documentation page. */
export const ErrorSchema = ErrorResponseSchema;

/** Marks a route as needing an access token on the documentation page. */
export const RequiresLogin = [{ bearerAuth: [] }];
