# CLAUDE.md – API

The self-built REST API for the recipe app: accounts, households and sync. **The design is in [`docs/api-design.md`](docs/api-design.md).** Follow it, and update it when the design changes, because the student uses it for the school report.

## Project state

- **Done:** project setup, `GET /v1/health`, the migration runner and the full database schema (migration 001).
- **Next, in this order:** login (signup, login, refresh, logout, delete account) → household and invites → sync → Docker and Caddy on the VPS (needs a domain name first).

## Commands

Run from `api/`. Package manager is npm.

```bash
npm run dev        # start with auto-reload on http://localhost:3000 (runs migrations first)
npm test           # run all tests once (Vitest, against the test database)
npm test -- test/health.test.ts   # run one test file
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # compile src/ to dist/ (for the server)
npm start          # run the compiled build
```

Run lint, typecheck and tests before considering a task done.

- API documentation generated from the Zod schemas: http://localhost:3000/documentation while `npm run dev` runs.
- `.env` (never committed) holds `DATABASE_URL`, `TEST_DATABASE_URL`, `HOST` and `PORT`. `.env.example` shows the format.

## Local setup

- **Node.js 22.12 or newer.** PostgreSQL 18 is installed natively on Windows (service `postgresql-x64-18`). `psql` is not on PATH: use `"C:\Program Files\PostgreSQL\18\bin\psql.exe"`.
- The API connects as its own user `recipe_app`, not the `postgres` admin. Databases: `recipe_app` (development) and `recipe_app_test` (tests).
- Creating users or databases needs the `postgres` password. Never ask the student to paste it into the chat. Write a SQL script and let them run it with `psql -U postgres -f <script>`.

## Tech stack

- Fastify 5 with `fastify-type-provider-zod` (Zod 4) for validation, response serialization and typed requests
- `pg` (node-postgres) with plain parameterized SQL
- `@fastify/swagger` and `@fastify/swagger-ui` for the documentation page
- TypeScript 6 in strict mode, ES modules (`"type": "module"`)
- Vitest for tests, `tsx` for running TypeScript in development
- TypeScript 7 exists, but `typescript-eslint` only supports up to 6.0, so stay on `~6.0`
- Planned, add when the feature needs them: argon2, `jose`, `@fastify/rate-limit`. Check current docs and versions before installing.

## Structure

```
src/
  server.ts       starts the API: config → database pool → migrations → listen
  app.ts          buildApp(): registers plugins and routes, doesn't listen (tests use app.inject)
  config.ts       environment variables, validated with Zod
  errors.ts       ApiError and the error response schema
  plugins/        cross-cutting: error handler (later: auth check, rate limiting)
  routes/         one file per area, a Fastify plugin with Zod schemas per endpoint
  services/       business rules
  repositories/   all SQL
  db/             pool, transactions, migration runner, migrations/
test/             *.test.ts, plus helpers/ and setup.ts
docs/             api-design.md
```

## Layers and loose coupling

Same principle as the app (see "Loose coupling" in `mobile/CLAUDE.md`): **routes → services → repositories → Postgres.** Each layer only calls the one below.

- **Routes** declare method, path and Zod schemas for body, params, query and every response status, then call a service. No SQL and no business rules. Give each route a `summary` and `tags` for the documentation page.
- **Services** hold the rules ("only the creator can remove members"). They throw `ApiError(status, code, message)` for errors the client should see, with the codes listed in `docs/api-design.md`.
- **Repositories** hold all SQL. They take a `Database` as their first parameter (`Pick<Pool | PoolClient, 'query'>`), so they work both on the pool and inside `withTransaction`.
- **Dependencies are passed in, not imported.** `buildApp({ db })` gets the database, and route plugins get it through their options. That is how tests swap in the test database or a broken one.
- Don't add DI containers, base classes or interfaces with one implementation.

## Rules

- **Every query on household data filters by `household_id`**, taken from the logged-in user on the server, never from the request body. This is how one household can never see another's data.
- **Parameterized queries only** (`$1`, `$2`). Never build SQL from strings with user data.
- **Validate everything that comes in** with a Zod schema on the route. Unknown fields are stripped.
- **Errors** always have the shape `{ error: { code, message, details? } }`, set in `plugins/error-handler.ts`. Never send stack traces. 5xx errors are logged.
- **Imports** are relative and end in `.ts` (`import { x } from './db/database.ts'`). The build rewrites them to `.js`. There is no `@/` alias here, because compiled code couldn't resolve it.
- **Code style** as in the app: named exports, no `any`, explicit return types on exported functions, early returns, comment why, not what.

## Database

- **Migrations** are TypeScript files in `src/db/migrations/` (`001-initial.ts`, ...) exporting SQL, listed in order in `migrations/index.ts`. Versions are 1, 2, 3, ... and recorded in `schema_migrations`. Each runs in its own transaction. Never edit a migration that has been run. Add a new one.
- **Household data tables** mirror the app's SQLite tables, plus:
  - `household_id`, with primary key `(household_id, id)`, because name-based ids are the same in every household
  - foreign keys that include `household_id`
  - `change_number`, from the shared `change_numbers` sequence
- **The `touch_row` trigger** sets a new `change_number` and `updated_at = now()` on every UPDATE. Don't set them yourself, and never trust timestamps from devices.
- **Types:** `timestamptz` for timestamps, `date` for calendar days (returned as `'YYYY-MM-DD'` strings), `boolean` for booleans. `bigint` comes back as a JS number (type parsers in `db/database.ts`).
- `households.created_by` and `users.household_id` reference each other with deferred foreign keys, so a household and its creator are inserted in the same transaction.

## Testing

- Tests run against the real Postgres test database. `createTestDatabase()` in `test/helpers/test-database.ts` empties it (drops the `public` schema) and runs migrations. Call `pool.end()` in `afterAll`.
- Test files run one at a time (`fileParallelism: false`), because they share the test database.
- Test the API through HTTP with `app.inject()`, and test services and repositories directly where that's simpler.
- Write tests for every endpoint, including its error cases and access rules (another household's data must be invisible).
