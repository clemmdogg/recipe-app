import { z } from 'zod';

const ConfigSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required. Copy .env.example to .env.'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters. See .env.example for how to make one.'),
  // On the server, requests arrive through Caddy. Trusting it lets the API see each phone's real
  // IP address, which rate limiting needs. Only turn this on behind a proxy.
  TRUST_PROXY: z.stringbool().default(false),
  // Invite links are `${INVITE_LINK_BASE_URL}/${code}`. On the server: https://<domain>/join
  INVITE_LINK_BASE_URL: z.url().default('http://localhost:3000/join'),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Reads the settings from environment variables (the .env file locally, Docker on the server).
 * Fails at startup with a clear message instead of later with a confusing one.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = ConfigSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
