import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createPool } from './db/database.ts';
import { runMigrations } from './db/migrate.ts';

const config = loadConfig();
const pool = createPool(config.DATABASE_URL);

// Like the app, the API brings its database schema up to date before it accepts requests.
await runMigrations(pool);

const app = await buildApp({
  pool,
  accessTokenSecret: config.JWT_SECRET,
  trustProxy: config.TRUST_PROXY,
  inviteLinkBaseUrl: config.INVITE_LINK_BASE_URL,
  logger: true,
});
await app.listen({ host: config.HOST, port: config.PORT });

// Finish open requests and close database connections when stopped (Ctrl+C, or Docker).
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await app.close();
    await pool.end();
    process.exit(0);
  });
}
