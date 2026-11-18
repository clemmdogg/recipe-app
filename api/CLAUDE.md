# CLAUDE.md – API

The self-built REST API for the recipe app: accounts, households and sync. **The design is in [`docs/api-design.md`](docs/api-design.md).** Follow it, and update it when the design changes, because the student uses it for the school report.

## Project state

- **Done:**
  - project setup, `GET /v1/health`, the migration runner and the full database schema (migration 001)
  - login: `POST /v1/auth/signup`, `login`, `refresh`, `logout`, `GET /v1/me` and `DELETE /v1/me`, the access token check and rate limiting
  - household and invites: `GET`/`PATCH /v1/household`, `POST /v1/household/invites`, `POST /v1/household/leave`, `DELETE /v1/household/members/:userId`, `GET /v1/invites/:code` and `POST /v1/invites/:code/accept`
  - sync: `GET /v1/changes` (pull) and `POST /v1/changes` (push)
- **Next:** Docker and Caddy on the VPS, including the static `/join/<code>` page (needs a domain name first). Then connect the app.

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
- `.env` (never committed) holds `DATABASE_URL`, `TEST_DATABASE_URL`, `HOST`, `PORT`, `JWT_SECRET`, `TRUST_PROXY`, `INVITE_LINK_BASE_URL` and `CORS_ORIGINS`. `.env.example` shows the format. `src/config.ts` validates them at startup.
- To try protected routes on the documentation page: sign up or log in there, copy `accessToken`, click "Authorize" and paste it.

## Local setup

- **Node.js 22.12 or newer.** PostgreSQL 18 is installed natively on Windows (service `postgresql-x64-18`). `psql` is not on PATH: use `"C:\Program Files\PostgreSQL\18\bin\psql.exe"`.
- The API connects as its own user `recipe_app`, not the `postgres` admin. Databases: `recipe_app` (development) and `recipe_app_test` (tests).
- Creating users or databases needs the `postgres` password. Never ask the student to paste it into the chat. Write a SQL script and let them run it with `psql -U postgres -f <script>`.

## Tech stack

- Fastify 5 with `fastify-type-provider-zod` (Zod 4) for validation, response serialization and typed requests
- `pg` (node-postgres) with plain parameterized SQL
- `@fastify/swagger` and `@fastify/swagger-ui` for the documentation page
- `argon2` (argon2id) for passwords, `jose` for access tokens (HS256 JWT), `@fastify/rate-limit`, `@fastify/cors` (the app also runs in a browser; allowed addresses in `CORS_ORIGINS`)
- TypeScript 6 in strict mode, ES modules (`"type": "module"`)
- Vitest for tests, `tsx` for running TypeScript in development
- TypeScript 7 exists, but `typescript-eslint` only supports up to 6.0, so stay on `~6.0`
- Check current docs and versions before adding a library.

## Structure

```
src/
  server.ts       starts the API: config → database pool → migrations → listen
  app.ts          buildApp(): registers plugins and routes, doesn't listen (tests use app.inject)
  config.ts       environment variables, validated with Zod
  errors.ts       ApiError and the error response schema
  plugins/        cross-cutting: error handler, the authenticate hook
  routes/         one file per area, a Fastify plugin with Zod schemas per endpoint; shared schemas in schemas.ts
  services/       business rules (auth, account, household, invites, membership, sync)
  repositories/   all SQL
  security/       passwords (argon2), access tokens (JWT), refresh tokens (random + SHA-256), invite codes
  types/          shared TypeScript types, and the Zod schemas for synced rows (sync.ts)
  db/             pool, transactions, migration runner, migrations/
test/             *.test.ts, plus helpers/ and setup.ts
docs/             api-design.md
```

## Layers and loose coupling

Same principle as the app (see "Loose coupling" in `mobile/CLAUDE.md`): **routes → services → repositories → Postgres.** Each layer only calls the one below.

- **Routes** declare method, path and Zod schemas for body, params, query and every response status, then call a service. No SQL and no business rules. Give each route a `summary` and `tags` for the documentation page.
- **Services** hold the rules ("only the creator can remove members"). They throw `ApiError(status, code, message)` for errors the client should see, with the codes listed in `docs/api-design.md`.
- **Repositories** hold all SQL. They take a `Database` as their first parameter (`Pick<Pool | PoolClient, 'query'>`), so they work both on the pool and inside `withTransaction`.
- **Dependencies are passed in, not imported.** `buildApp({ pool, accessTokenSecret })` gets the database and the JWT secret, and route plugins get it through their options. That is how tests swap in the test database or a broken one.
- Don't add DI containers, base classes or interfaces with one implementation.

## Authentication

- **Protected routes** get the `authenticate` hook through their plugin options and add it with `app.addHook('onRequest', authenticate)`. In a handler, `requireAuth(request)` returns `{ id, householdId }`. See `routes/me.ts`.
- The hook verifies the JWT and then **loads the user's current household from the database** on every request, so leaving, joining, removal and account deletion take effect at once. Don't put the household id in the token.
- **Access tokens** last 15 minutes. **Refresh tokens** last 30 days, are stored only as a SHA-256 hash, and rotate on every use. Reusing a rotated token revokes all of the user's tokens.
- Login gives the same `invalid_credentials` error, and takes about the same time, for an unknown email and a wrong password (`rejectUnknownUser`).
- Emails are trimmed and lowercased by `EmailSchema` before they reach services.
- **Rate limiting** is off by default. Routes opt in with `config: { rateLimit }` (signup, login, refresh, and both invite routes against code guessing). On the server, set `TRUST_PROXY=true` so the limit is per phone, not per Caddy.
- **Anyone leaving a household** (delete account, leave, joining another, removal) goes through `leaveHousehold()` in `services/membership.ts`, in the same transaction. It deletes an empty household or hands the creator role to the longest-standing member. `moveToNewHousehold()` gives someone a new empty household.
- **Invite codes** are stored uppercase without the dash and shown as `XXXX-XXXX`. Normalize user input with `normalizeInviteCode()`.
- **Optional request bodies:** Fastify passes `null` when there is no body, and Zod's `.default()` only replaces `undefined`. Use `.nullish()` and a fallback in the handler (see `routes/invites.ts`).

## Sync

- **`src/types/sync.ts` is the single definition of the six synced tables**: each table's id and fields as Zod schemas, the pull and push schemas, and `SyncedTableNames` in push order (parents before children). Change a synced table there, in its migration, and in the column list in `repositories/synced-rows.ts`. Its type makes a missing column a compile error.
- **`repositories/synced-rows.ts`** has one set of functions for all six tables, built from that column list. Table and column names come only from the list; values always go in as `$` parameters.
- **Pull** (`pullChanges`) takes each table's oldest `limit + 1` changes, merges them, and cuts at `limit`. The cursor is the last included row's change number. Columns are aliased in SQL to API field names, and timestamps are formatted as ISO strings in SQL.
- **Push** (`pushChanges`) runs in one transaction and starts with `lockHousehold()`. **Every write to a synced table must hold that lock**, so a household's change numbers become visible in order; otherwise a pull could skip a row. Foreign key and unique violations become `400 validation_failed`.
- **Conflict rules** are in `applyRow()` and the "Conflict rules" section of `docs/api-design.md`. Change both together.
- **Keep the push path's types loose** (`PushedRowOfAnyTable`). A generic per-table row type there made `tsc` run out of memory working out every table combination.

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
- Build the app with `buildTestApp(pool)` (`test/helpers/test-app.ts`), which uses a test JWT secret and a high rate limit. Test the API through HTTP with `app.inject()`, and test services and repositories directly where that's simpler.
- `test/helpers/accounts.ts` has `signUp(app)` (a new user with a unique email), `join(app, inviter, joiner)`, `createInvite(app, user)`, `addMember(pool, householdId, joinedAt)` (to control join times), `addPantryItem(pool, householdId)` and `bearer(accessToken)`.
- Write tests for every endpoint, including its error cases and access rules (another household's data must be invisible).
