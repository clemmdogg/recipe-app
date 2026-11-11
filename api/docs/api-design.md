# Recipe App API – Design

Status: **draft for review**. Nothing here is built yet. Questions that still need an answer are listed at the end under [Open questions](#open-questions).

## 1. Purpose

The mobile app works fully offline with a local SQLite database. This API adds three things:

1. **Accounts:** users sign up and log in with email and password.
2. **Households:** a family shares one set of data (saved recipes, meal plan, shopping lists, pantry), and members can invite others.
3. **Sync:** each device sends its local changes to the server and fetches the changes made by other family members.

The API is a self-built RESTful API in TypeScript on Node.js, with a PostgreSQL database.

## 2. Architecture

```
 Phone / web app
       │  HTTPS (TLS)
       ▼
 ┌──────────── Contabo VPS ─────────────────────────────┐
 │  Caddy  (ports 80 and 443, the only open ports)      │
 │    │  plain HTTP inside the Docker network           │
 │    ▼                                                 │
 │  API container (Node.js + Fastify, port 3000)        │
 │    │                                                 │
 │    ▼                                                 │
 │  Postgres container (port 5432, not exposed)         │
 └──────────────────────────────────────────────────────┘
```

### Libraries

| Purpose | Library |
|---|---|
| Web framework | Fastify |
| Input validation | Zod, through `fastify-type-provider-zod` |
| Database access | `pg` (node-postgres) with plain parameterized SQL |
| Password hashing | `argon2` (argon2id) |
| Access tokens | `jose` (JWT) |
| API documentation page | `@fastify/swagger` and `@fastify/swagger-ui`, generated from the Zod schemas |
| Rate limiting | `@fastify/rate-limit`, on signup, login and refresh |

The app runs on phones and tablets only. There is no web version, so the API doesn't need CORS.

### Layers

The API is split into layers, like the app. Each layer only calls the layer below it, so each part can change without breaking the others (loose coupling).

| Layer | Folder | Does |
|---|---|---|
| Routes | `src/routes/` | Declares each endpoint: method, path, Zod schemas for the request and response, and which service function to call. No SQL and no business rules. |
| Services | `src/services/` | Business rules: "only the creator can remove members", "joining moves the user", sync conflict rules. |
| Repositories | `src/repositories/` | All SQL. Every query on household data filters by `household_id`. |
| Plugins | `src/plugins/` | Things shared by all routes: the database connection, the login check, error handling. |

Shared Zod schemas (for example the shape of a pantry item) can live in a folder that both `mobile/` and `api/` import, so the app and the API always agree on the data.

## 3. Conventions

- **Base URL:** `https://api.<your-domain>/v1`. The `/v1` prefix lets a future version change the API without breaking installed apps.
- **Format:** JSON request and response bodies, `Content-Type: application/json`.
- **Field names:** `camelCase` in JSON, `snake_case` in the database.
- **Ids:** UUIDs as strings. Recipes use TheMealDB's `idMeal`.
- **Timestamps:** ISO 8601 UTC strings, e.g. `"2026-11-11T18:30:00.000Z"`. Calendar dates are `"YYYY-MM-DD"`.
- **Authentication:** every endpoint except signup, login, token refresh and the health check needs the header `Authorization: Bearer <accessToken>`.
- **Unknown fields** in a request body are ignored and removed. In particular, the API never trusts a `householdId` sent by the app. It always uses the household of the logged-in user.

### Errors

Every error has the same shape:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "name: String must contain at least 1 character",
    "details": [{ "path": ["name"], "message": "String must contain at least 1 character" }]
  }
}
```

`code` is a fixed, machine-readable string the app can check. `message` is for developers. `details` is only included for validation errors. Stack traces are never sent to the client.

### Status codes

| Code | Meaning | Example |
|---|---|---|
| 200 OK | Success, with a body | Reading the household |
| 201 Created | Something new was created | Signing up, creating an invite |
| 204 No Content | Success, nothing to return | Logging out |
| 400 Bad Request | The body or query string is invalid | Missing password |
| 401 Unauthorized | Not logged in, or the token is invalid or expired | Missing `Authorization` header |
| 403 Forbidden | Logged in, but not allowed | A non-creator removing a member |
| 404 Not Found | It doesn't exist, or belongs to another household | Unknown invite code |
| 409 Conflict | The request clashes with the current state | Email already registered |
| 410 Gone | It existed but has expired | Invite older than 7 days |
| 429 Too Many Requests | Rate limit hit | Too many login attempts |
| 500 Internal Server Error | A bug on the server | – |

## 4. Endpoints

Overview:

| Method | Path | Login | Purpose |
|---|---|---|---|
| GET | `/v1/health` | No | Is the API running? |
| POST | `/v1/auth/signup` | No | Create an account and an empty household |
| POST | `/v1/auth/login` | No | Log in |
| POST | `/v1/auth/refresh` | No* | Get a new access token |
| POST | `/v1/auth/logout` | No* | Log out on this device |
| GET | `/v1/me` | Yes | The logged-in user |
| DELETE | `/v1/me` | Yes | Delete the account |
| GET | `/v1/household` | Yes | The user's household and its members |
| PATCH | `/v1/household` | Yes | Rename the household |
| POST | `/v1/household/invites` | Yes | Create an invite link |
| GET | `/v1/invites/{code}` | Yes | Preview an invite before joining |
| POST | `/v1/invites/{code}/accept` | Yes | Join the household |
| POST | `/v1/household/leave` | Yes | Leave the household |
| DELETE | `/v1/household/members/{userId}` | Yes, creator only | Remove a member |
| GET | `/v1/changes` | Yes | Pull changes since the last sync |
| POST | `/v1/changes` | Yes | Push local changes |

\* These use the refresh token in the body instead of the access token.

### 4.1 Health

#### `GET /v1/health`

Used by Docker and by you to check that the API and the database are up.

- **200** `{ "status": "ok" }`
- **503** `{ "status": "database_unavailable" }`

### 4.2 Accounts and login

#### `POST /v1/auth/signup`

Creates a user and a new empty household with the user as its creator and only member.

Request:

```json
{ "email": "anna@example.com", "password": "correct horse battery", "name": "Anna" }
```

| Field | Rules |
|---|---|
| `email` | Valid email, max 254 characters. Stored in lowercase. |
| `password` | 8 to 128 characters. No other rules (no "must contain a digit"), as current guidance recommends. |
| `name` | 1 to 50 characters after trimming. Shown to other household members. |

Response **201**:

```json
{
  "user": { "id": "…", "email": "anna@example.com", "name": "Anna" },
  "household": { "id": "…", "name": "Anna's household" },
  "accessToken": "eyJhbGciOi…",
  "refreshToken": "q3Jk…"
}
```

Errors: **400** `validation_failed`, **409** `email_taken`, **429** `rate_limited`.

#### `POST /v1/auth/login`

Request: `{ "email": "anna@example.com", "password": "correct horse battery" }`

Response **200**: same body as signup.

Errors: **400** `validation_failed`, **401** `invalid_credentials`, **429** `rate_limited`.

The API gives the same `invalid_credentials` error for an unknown email and a wrong password, so nobody can use it to find out which emails have accounts.

#### `POST /v1/auth/refresh`

Swaps a refresh token for a new access token and a new refresh token. The old refresh token stops working (rotation, see [section 6](#6-authentication)).

Request: `{ "refreshToken": "q3Jk…" }`

Response **200**: `{ "accessToken": "…", "refreshToken": "…" }`

Errors: **401** `invalid_refresh_token` (unknown, expired or already used), **429** `rate_limited`. On 401 the app shows the sign-in screen.

#### `POST /v1/auth/logout`

Revokes the refresh token for this device. Other devices stay logged in.

Request: `{ "refreshToken": "q3Jk…" }`

Response **204**. Also returns 204 if the token was already invalid, so logging out always succeeds.

Before calling this, the app warns if there are unsynced changes, then deletes its local database.

#### `GET /v1/me`

Response **200**:

```json
{
  "user": { "id": "…", "email": "anna@example.com", "name": "Anna" },
  "household": { "id": "…", "name": "The Jensens" }
}
```

#### `DELETE /v1/me`

Deletes the user's account for good. The password is asked for again, so nobody can delete the account from a phone that was left unlocked.

Request: `{ "password": "correct horse battery" }`

Response **204**.

What happens:

1. All the user's refresh tokens are deleted, so every device is logged out.
2. If they were the household's creator, the member who has been there the longest becomes the new creator.
3. If they were the last member, the household and all its data are deleted.
4. The user row is deleted, including email, name and password hash. Household data they created stays with the household, because it belongs to the family, not to them.

Errors: **400** `validation_failed`, **401** `unauthenticated` or `token_expired`, **403** `wrong_password`.

The app then deletes its local database and shows the sign-in screen.

### 4.3 Household

Every user is in exactly one household. These endpoints always act on the logged-in user's household, so they don't need a household id in the path.

#### `GET /v1/household`

Response **200**:

```json
{
  "id": "…",
  "name": "The Jensens",
  "createdBy": "user-id-of-anna",
  "members": [
    { "id": "user-id-of-anna", "name": "Anna", "joinedAt": "2026-11-01T10:00:00.000Z", "isCreator": true },
    { "id": "user-id-of-ben", "name": "Ben", "joinedAt": "2026-11-03T19:12:00.000Z", "isCreator": false }
  ]
}
```

Members' email addresses are not shown to each other.

#### `PATCH /v1/household`

Any member can rename the household.

Request: `{ "name": "The Jensens" }` (1 to 50 characters)

Response **200**: the household, as in `GET /v1/household`.

#### `POST /v1/household/invites`

Any member can create an invite. An invite works for anyone who has the link, can be used more than once, and expires after 7 days.

Request: no body.

Response **201**:

```json
{
  "code": "K7MQ-2XPA",
  "url": "https://<your-domain>/join/K7MQ-2XPA",
  "expiresAt": "2026-11-18T18:30:00.000Z"
}
```

The code is 8 random characters from an alphabet without look-alikes (no `0`/`O`, `1`/`I`), so it is easy to type in by hand. The app shares `url` with the system share sheet.

The link doesn't open the app directly. It opens a simple web page that shows the code and tells the person to install the app and enter the code under Household → Join with code. Caddy serves this page as a static HTML file for every `/join/…` address, and a few lines of JavaScript read the code from the address. This avoids the extra setup that opening the app from a link would need (Android App Links).

#### `GET /v1/invites/{code}`

Lets the app show "Join *The Jensens* (3 members)?" before the user decides, and warn about data loss.

Response **200**:

```json
{
  "householdName": "The Jensens",
  "memberCount": 3,
  "expiresAt": "2026-11-18T18:30:00.000Z",
  "joiningDeletesData": true
}
```

`joiningDeletesData` is `true` when the user is the only member of their current household and it has data. That data is deleted when they join.

Errors: **404** `invite_not_found`, **410** `invite_expired`, **409** `already_member` (the invite is for the user's own household).

#### `POST /v1/invites/{code}/accept`

Moves the user to the invite's household. If their old household has no members left, it is deleted with all its data.

Request:

```json
{ "confirmDataLoss": true }
```

`confirmDataLoss` must be `true` when `joiningDeletesData` is true. This makes sure the app has shown the warning.

Response **200**: the new household, as in `GET /v1/household`.

Errors: **404** `invite_not_found`, **410** `invite_expired`, **409** `already_member`, **409** `data_loss_not_confirmed`.

After joining, the app deletes its local database and does a full pull of the new household's data.

#### `POST /v1/household/leave`

Moves the user to a new empty household. If the user was the creator, the member who has been in the household the longest (earliest `joinedAt`) becomes the new creator. Joining another household with an invite works the same way.

Request: no body.

Response **200**: the new household.

Errors: **409** `only_member`. Leaving a household you are alone in would just swap it for another empty one, so the API refuses.

#### `DELETE /v1/household/members/{userId}`

Only the household's creator can remove others. The removed user gets a new empty household and loses access straight away (see [section 6](#6-authentication)).

Response **204**.

Errors: **403** `not_creator`, **404** `member_not_found`, **409** `cannot_remove_self` (use leave instead).

### 4.4 Sync

Sync uses one resource, `changes`: you **GET** the changes others made and **POST** your own.

These tables are synced: `recipes`, `recipeIngredients`, `mealPlanEntries`, `shoppingLists`, `shoppingListItems` and `pantryItems`. The local `ingredients` table is a cache of TheMealDB and is never synced.

#### Change numbers

Each synced row on the server has a `changeNumber`. Every time any row is created, changed or deleted, it gets the next number from a single counter (a Postgres sequence). Change numbers only ever go up.

This is what tells a device what's new: "give me every row with a change number above the last one I saw". It is safer than comparing timestamps, because two changes can have the same timestamp but never the same change number.

#### `GET /v1/changes?since={changeNumber}&limit={n}`

| Query parameter | Rules |
|---|---|
| `since` | The `cursor` from the previous pull. Leave it out (or use `0`) for a first, full sync. |
| `limit` | Max rows to return, 1 to 1000. Default 500. |

Response **200**:

```json
{
  "cursor": 1842,
  "hasMore": false,
  "changes": {
    "pantryItems": [
      {
        "id": "6f1c…",
        "ingredientName": "Garlic",
        "createdAt": "2026-11-10T08:00:00.000Z",
        "updatedAt": "2026-11-11T17:02:00.000Z",
        "deletedAt": null,
        "changeNumber": 1840
      }
    ],
    "mealPlanEntries": [],
    "recipes": [],
    "recipeIngredients": [],
    "shoppingLists": [],
    "shoppingListItems": []
  }
}
```

- Deleted rows are included, with `deletedAt` set, so other devices delete them too.
- The app saves `cursor` and sends it as `since` next time.
- If `hasMore` is `true`, the app pulls again straight away with the new cursor.

#### `POST /v1/changes`

Sends the rows this device changed since it last pushed. The whole push is applied in one database transaction: either all rows are saved, or none are.

Request:

```json
{
  "changes": {
    "pantryItems": [
      {
        "id": "6f1c…",
        "ingredientName": "Garlic",
        "deleted": false,
        "baseChangeNumber": 1702
      }
    ],
    "mealPlanEntries": [
      {
        "id": "a9e2…",
        "date": "2026-11-14",
        "recipeId": "52772",
        "deleted": true,
        "baseChangeNumber": 1650
      }
    ]
  }
}
```

- Each row has its normal data fields, plus `deleted` and `baseChangeNumber`.
- `deleted: true` means "delete this row". The server sets `deletedAt` itself.
- `baseChangeNumber` is the row's `changeNumber` the last time this device pulled it. It is `null` for rows this device created and never pulled.
- The server sets `createdAt`, `updatedAt` and `changeNumber`. It ignores any timestamps from the device, because device clocks can't be trusted.
- Tables are applied in an order that respects foreign keys: recipes before their ingredients and meal plan entries, shopping lists before their items.
- Max 1000 rows per push. The app splits larger pushes.

Response **200**:

```json
{
  "applied": 2,
  "rejected": [
    { "table": "pantryItems", "id": "…", "reason": "deleted_on_server" }
  ]
}
```

After pushing, the app pulls. That brings in other people's changes and the server's version of any rejected rows.

Errors: **400** `validation_failed` (for example a meal plan entry pointing to a recipe that doesn't exist in the household). Nothing is saved in that case.

#### Conflict rules

These follow the decisions in `mobile/CLAUDE.md`:

1. **Last write wins per row.** If two devices change the same row, the change that reaches the server last is kept. Changes are compared per row, so Anna ticking off milk and Ben ticking off eggs never conflict.
2. **A soft delete beats a concurrent edit.** If the row was deleted on the server *after* the device last saw it (the server's delete has a higher change number than `baseChangeNumber`), an edit from that device is rejected with `deleted_on_server`. The device didn't know about the delete, so its edit loses.
3. **Restoring is allowed when the device knew about the delete.** If the device had already pulled the delete and then adds the row again (for example garlic back in the pantry), the row is restored. This matches the app's rule that adding a soft-deleted row restores it.
4. **Rows with a natural key merge.** Pantry items, shopping lists and shopping list lines have ids derived from their name. If two devices add "Garlic" offline, both send the same id, and it becomes one row.

## 5. Database

Postgres mirrors the app's SQLite tables, with these differences:

- **Every household table has a `household_id` column**, and its primary key is `(household_id, id)`. This is needed because name-based ids are the same in every household: "Garlic" in the pantry has the same id for all families, and two households can save the same TheMealDB recipe. Foreign keys include `household_id` too, so a row can never point into another household.
- **Every household table has `change_number BIGINT`**, set from one shared sequence on every insert and update.
- Postgres types instead of SQLite's: `timestamptz` for timestamps, `date` for calendar dates, `boolean` for booleans.

New tables for accounts:

| Table | Columns |
|---|---|
| `households` | `id`, `name`, `created_by` (user id), `created_at` |
| `users` | `id`, `email` (unique, lowercase), `password_hash`, `name`, `household_id`, `joined_household_at`, `created_at` |
| `invites` | `code` (primary key), `household_id`, `created_by`, `expires_at`, `created_at` |
| `refresh_tokens` | `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, `replaced_by`, `created_at` |

`users.household_id` is a plain column, not a separate membership table, because a user is in exactly one household.

Schema changes go through numbered migration files, like the app.

## 6. Authentication

### Passwords

- Passwords are hashed with **argon2id**, which is the current recommendation for password storage. The hash includes a random salt, so two users with the same password get different hashes.
- The plain password is never stored or logged.
- Login and signup are rate limited (for example 10 attempts per minute per IP address) to slow down password guessing.

### Two kinds of tokens

After login, the app gets two tokens:

| | Access token | Refresh token |
|---|---|---|
| What | A signed JWT | A long random string (not a JWT) |
| Lifetime | 15 minutes | 30 days |
| Sent | With every request, in `Authorization: Bearer …` | Only to `/auth/refresh` and `/auth/logout` |
| Stored on the server | No. The server checks the signature. | Yes, as a SHA-256 hash, so a database leak doesn't expose usable tokens |

Why two tokens? The access token is checked on every request without a database lookup, but a stolen one only works for 15 minutes. The refresh token lasts long enough that users stay logged in, and because the server stores it, it can be revoked at logout.

**The access token** is signed with HS256 using a secret only the server knows (an environment variable, never in git). It contains:

```json
{ "sub": "<user id>", "iat": 1762885800, "exp": 1762886700 }
```

It deliberately doesn't contain the household id. Membership can change (join, leave, removal), so the API looks up the user's current household on each request. A removed member therefore loses access immediately, not after their token expires.

**Refresh token rotation:** every time a refresh token is used, it is revoked and a new one is issued. If a revoked token is used again, someone has probably copied it, so the API revokes all of that user's refresh tokens and they must log in again on every device.

### On every request

A Fastify hook (`onRequest`) runs before every protected route:

1. Read the `Authorization` header. Missing or malformed → **401** `unauthenticated`.
2. Verify the JWT's signature and expiry with `jose`. Invalid or expired → **401** `token_expired` or `unauthenticated`.
3. Load the user and their current household id, and attach them to the request.

Repositories always take the household id from the request, never from the request body. Every query on household data has `WHERE household_id = $1`, which is how the API makes sure nobody can read or change another household's data.

### In the app

- Tokens are stored with `expo-secure-store` (the iOS Keychain and Android Keystore). This is one reason there is no web version: browsers have no equally safe place to keep them.
- When a request gets `401 token_expired`, the app calls `/auth/refresh` once and repeats the request. If the refresh also fails, it shows the sign-in screen.

## 7. HTTPS (SSL/TLS)

- **Caddy** is the only container with open ports (80 and 443). It gets a free certificate from **Let's Encrypt** for `api.<your-domain>` automatically and renews it before it expires.
- Caddy redirects every `http://` request to `https://`, and sends a `Strict-Transport-Security` (HSTS) header so browsers only use HTTPS afterwards.
- Traffic between the phone and Caddy is encrypted with TLS 1.2 or 1.3. Caddy then forwards it to the API container over the private Docker network.
- The API container and Postgres are not reachable from the internet at all.
- The app only knows the `https://` URL. Passwords and tokens therefore never travel unencrypted.
- This requires a domain name with a DNS record pointing at the VPS's IP address.

During local development the API runs on `http://localhost:3000` without TLS. That is fine because the traffic never leaves the computer.

## 8. Changes needed in the app

To sync, the app needs a few changes. These come after the API exists:

1. **Fix recipe ingredient ids** to be name-based (recipe id + position), as noted in `mobile/CLAUDE.md`. Otherwise two devices saving the same recipe would duplicate its ingredients.
2. **A new migration** adding to each synced table:
   - `change_number`: the server's number, saved when pulling
   - `needs_push`: set to 1 whenever the device changes the row, and cleared after a successful push

   A flag is more reliable than comparing `updated_at` with the last sync time, because pulled rows get the server's timestamps.
3. **Store the sync cursor** (the last `cursor` from a pull).
4. **New services** in `src/services/`: an API client, auth (sign-in, tokens) and sync (push, then pull).
5. **A sign-in screen**, and the Household tab built on the household endpoints.

## Open questions

1. **Domain name:** not set up yet. The API will be at `api.<domain>`, and invite links at `https://<domain>/join/<code>`. Until then, development runs on `http://localhost:3000`.

### Decided

- **When the creator leaves** or deletes their account, the member who has been in the household the longest becomes the new creator.
- **Users can delete their account** (`DELETE /v1/me`).
- **Rate limiting** with `@fastify/rate-limit` on signup, login and token refresh, e.g. 10 attempts per minute per IP address.
- **No web version.** The app runs on phones and tablets only.
- **Invite links open a simple web page** showing the code, which the user types into the app.
