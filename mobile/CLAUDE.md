# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

This is the mobile client of a recipe app (`recipe-app/mobile`), built on Expo SDK 58, React Native 0.88, React 19.3 and TypeScript 6.

- **Working locally:** Recipes, Plan, List and Pantry are complete, with all data in a local SQLite database (`expo-sqlite`).
- **Connected to the API:** login, household (members, invites, joining, leaving) and background sync with the family. Runs on phones, tablets and in a browser.
- **Next:** put the API and the web app on the VPS with Docker and Caddy (needs a domain name). See "Planned: login and household sync" below.

## Commands

Package manager is npm (`package-lock.json`), so use `npx`, not `bunx`.

```bash
npm start                # expo start (also: npm run ios / android / web)
npm run lint             # expo lint (flat config in eslint.config.js, extends eslint-config-expo)
npx tsc --noEmit         # typecheck
npm test                 # run all tests once (Jest, jest-expo preset)
npm test -- path/to/file # run a single test file
```

Run lint, type check and tests before considering a task done.

## Architecture

- **Routing**: Expo Router with `typedRoutes` enabled. Generated types live in `.expo/types` and are only refreshed when the dev server runs, so after adding or removing routes, run `npm start` once before `tsc`. The root `src/app/_layout.tsx` wraps everything in a navigation `ThemeProvider` and renders `AppTabs`.
- **Login gate**: the root layout is a `Stack` with `Stack.Protected` guards. Signed in, it shows the `(app)` group, whose `_layout.tsx` renders `AppTabs`. Signed out, it shows `sign-in.tsx` and `sign-up.tsx`. Flipping the session switches between them, so screens never navigate there themselves.
  - `SessionProvider` / `useSession()` in `src/view-models/session.tsx` hold the session, the shared `ApiClient`, and `signIn`/`signUp`/`signOut`. The saved login is read at start, offline, while `SplashScreenController` keeps the splash screen up.
  - **Talk to our API only through `ApiClient`** (`src/services/api-client.ts`, from `useSession().client`). It adds the access token, refreshes it once on `token_expired`, and signs out locally when the login is no longer valid. It throws `ApiRequestError` (with the API's `code`) or `NetworkError`.
  - Tokens and the session are stored behind the `AuthStorage` interface (`createAuthStorage()` in `src/services/auth-storage.ts`): with `expo-secure-store` on phones, and in `localStorage` in the browser (`auth-storage.web.ts`). Tests use `createMemoryAuthStorage()` from `jest/`.
  - The API address is `process.env.EXPO_PUBLIC_API_URL`, from `mobile/.env.local` (never committed, see `.env.example`). Write it out literally: Expo only inlines the literal form. Restart `npm start` after changing it.
- **Sync**: `SyncProvider` (`src/view-models/sync.tsx`) wraps the tabs in `(app)/_layout.tsx`, so it runs exactly while signed in. Screens never call it; they keep reading and writing SQLite.
  - It runs `syncNow()` (`src/services/sync.ts`: push, then pull) on start, when the app returns to the front, within 5 seconds of a local change (it polls `hasRowsToPush`), and every 60 seconds. Only one sync runs at a time.
  - `src/repositories/sync.ts` holds the sync SQL for all six tables, from one column list (API field ↔ column). Pulled rows are applied in one transaction with `PRAGMA defer_foreign_keys = ON`, because pages can deliver children before parents, and they never overwrite a row that still has `needs_push = 1`.
  - **View models that show household data call `useReloadOnSync(reload)`** next to `useReloadOnRefocus(reload)`, so they reload when a sync brings in others' changes.
  - `useSync()` gives `status` (`idle`/`syncing`/`offline`/`error`), `lastSyncedAt` and `sync()`.
  - The app has its own types for the API's sync data (`src/types/sync.ts`), mirroring `api/src/types/sync.ts`. Change both together.
  - **Each sync first asks the server for the user's household** (`GET /v1/me`), because the user may have joined another one on another device or been removed. A changed household is saved in the session.
- **Which household the local data belongs to** is stored in `sync_state` (`src/repositories/local-data.ts`). `syncNow(db, client, householdId)` checks it first:
  - Same household: sync as usual.
  - Another household: delete the local data, then pull the new household's. Never upload it.
  - None (data from before login): keep it and upload it, as the student decided.
  - Signing out and deleting the account clear the local data with `clearHouseholdData()`, which leaves a "cleared" marker. Anything written afterwards, e.g. by a sync still running, is deleted at the next sign-in instead of uploaded.
- **Switching household** (join, leave) first calls `useSync().uploadEverything()` and refuses with `NotUploadedError` if something couldn't be uploaded, so nothing is lost or uploaded to the wrong household. Then it calls the API, saves the new household in the session, and syncs.
- **Tabs**: Each tab is a folder in `src/app/(app)/` with its own `_layout.tsx` (a `Stack`) and `index.tsx`. The `(app)` group doesn't change URLs. Detail screens for a tab go in the same folder.
  - Recipes is the `(recipes)` route group, so its `index.tsx` is the app's start route `/`. Plan, List and Pantry are at `/plan`, `/list` and `/pantry`.
  - The tab bar is defined once in `src/constants/tabs.ts` (`TabRoutes`: route name, href, label, SF Symbol and Material icon). Add or change tabs there, not in the tab bar components.
- **Dialogs:** use `showMessage()` and `confirmAction()` from `src/components/dialogs.ts`, never `Alert.alert`. React Native's `Alert` does nothing in a browser; `dialogs.web.ts` uses the browser's own `alert`/`confirm`.
- **Platform-split files**: `.web.tsx` / `.web.ts` variants override the native files of the same name.
  - `app-tabs.tsx` uses native tabs (`expo-router/native-tabs`). Its triggers match on route `name`.
  - `app-tabs.web.tsx` builds the browser's tabs with `expo-router/ui` (`Tabs`/`TabList`/`TabTrigger`). Its triggers use `name` plus `href`. In windows at least `WebSidebarBreakpoint` (768) wide they are a sidebar on the left; narrower, a bar at the bottom like on a phone. The `TabList` always comes before the `TabSlot` (flipped with `column-reverse` for the bottom bar), so resizing past the breakpoint doesn't recreate the screens.
- **Web-only design changes must not change the phone design.** Put them in `.web.tsx` files or behind something phones never have, like hover.
  - Hover feedback: in a `Pressable` style function, `isHovered(state)` from `src/utils/pressable.ts` (only browsers report hover). Buttons, the recipe card and the web tabs use it.
  - `use-color-scheme` follows the same pattern.
- **Icons**: Use `SymbolView` from `expo-symbols` with `name={{ ios, android, web }}`. iOS uses SF Symbols, and Android and web use Material Symbols names. A bare string renders only on iOS.
  - Android and web draw Material Symbols with an outlined font, so names like `favorite` never look filled.
  - For a filled icon, pass `weight={FilledSymbolWeight}` from `src/constants/symbols.ts`, and use the `.fill` SF Symbol on iOS.
  - `SymbolView` loads its font only on mount, so give it a `key` that changes when switching between filled and outlined. `HeartIcon` shows the pattern.
- **Theming**: `src/constants/theme.ts` defines `Colors` (light/dark), `Fonts` (per platform, and on web it points to CSS variables in `src/global.css`), `Spacing` and `MaxContentWidth`. Use `useTheme()` or the `ThemedText`/`ThemedView` components (`type`/`themeColor` props) instead of hard-coding colors.
- **Path aliases**: `@/*` maps to `src/*`, and `@/assets/*` maps to `assets/*`.
- **Loading data in screens**: use `useAsyncResource(key, load)` from `src/hooks/use-async-resource.ts`. Don't write ad-hoc `useEffect` + `useState` fetching.
  - It reloads when `key` changes (pass `null` to load nothing) and aborts stale requests.
  - It returns `status` (`idle`/`loading`/`success`/`error`), `data`, `error` and `reload()`.
  - `data` is kept while reloading, so lists don't flash empty.
  - For results that change while the user types, pass `{ keepPreviousData: true }`. The previous key's data then stays visible while the new key loads.
  - View models (`src/view-models/`, e.g. `use-recipe-browser.ts`) combine it with repository and service functions. Screens stay thin. See "Layers" below.
- **Shared UI states**: `LoadingState`, `ErrorState` (with an optional retry) and `EmptyState` in `src/components/`.
- **Detail screens** live inside their tab's folder, e.g. `src/app/(app)/(recipes)/recipe/[id].tsx` is `/recipe/[id]`. Link to them with the object form: `{ pathname: '/recipe/[id]', params: { id } }`.
- **Don't wrap a `Pressable` that has a style function (`style={({ pressed }) => ...}`) in `<Link asChild>`.** Link merges the child's style as an object, so the function and all its layout styles (width, flex) are silently dropped. Navigate in `onPress` with `router.push(...)` instead.
- **Screens shared between tabs:** put the screen in `src/components/` and add a thin route file in each tab, so navigation stays inside the current tab.
  - The recipe screen (`RecipeScreen`, with a `tab` prop) is routed at `/recipe/[id]` and `/plan/recipe/[id]`.
  - The "Add to plan" modal is routed at `/add-to-plan` and `/plan/add-to-plan`.
- **Modals:** use `presentation: 'modal'` with `headerBackVisible: false` and `headerRight: () => <CloseButton />`, declared in the tab's `_layout.tsx`. Close a modal with `router.back()` after its action.
  - Don't use `formSheet`. On Android it can't show a header, and on web it renders as a normal screen.
- **Refreshing after changes elsewhere:** call `useReloadOnRefocus(resource.reload)` in screens that show data changed in other screens or modals. It skips the first focus to avoid double loading.
- **Dates:** use `src/utils/dates.ts`.
  - Calendar days are local `DateKey` strings (`'YYYY-MM-DD'`), made with `toDateKey`. Never use `toISOString().slice(0, 10)`, which gives the UTC date.
  - Do date arithmetic with `addDays`, never by adding milliseconds, so it survives daylight saving changes.
  - Weeks start on Monday, and display formatting uses `en-GB`.
  - Tests run in `Europe/Copenhagen` (set in `jest/setup.ts`).
- **React Compiler is enabled** (`experiments.reactCompiler`), so manual `useMemo`/`useCallback` is usually unnecessary.
- **Web output is `server`** (`app.json` → `web.output`), which allows API routes (`+api.ts`) in `src/app/`.

# Recipe App

Mobile recipe app built with React Native (Expo) and a local SQLite database.
A cloud API and database will be added later, so local data must be sync-ready.

**This is a school project.** It will not be published on the App Store or Google Play. It is shown via Expo Go, an installable Android build, or in a web browser.

- **Phones, tablets and the web (decided).** The student first dropped the web version, then changed their mind: the app must also work in a browser.
  - In the browser, the login is kept in `localStorage`. The student accepted the trade-off: an XSS bug could leak tokens, but the app never renders users' HTML and access tokens last 15 minutes. httpOnly cookies were rejected as too much API work.
  - The API allows the web app's address with CORS (`CORS_ORIGINS` in `api/.env`). Locally that is the Expo dev server, `http://localhost:8081`.
  - Test web changes with `npm run web`. `npx expo export --platform web` checks that the web build compiles.
  - On the server, Caddy will also serve the web build (see "Decided: backend and login" → Hosting). `web.output` is `server` today and needs to become `single` or `static` for Caddy to serve it as files.

- The school requires a **self-built RESTful API** and **SSL (HTTPS)**. The API is part of what gets graded, so don't replace it with a backend service that generates the API, such as Supabase or Firebase.
- TheMealDB's free test key `1` is allowed "for educational use", so no supporter key is needed.

## Planned: login and household sync

Later, users must **log in before they can use the app**. Their data will live in a cloud database and be **shared with their family (household)**.

The plan is to build this after the pantry and shopping list work locally. Check current docs for every library and tool before using it.

**Decided: households**

- **Login is required.** There is no anonymous use: the app shows a sign-in screen until the user is logged in. Local data therefore always belongs to a signed-in user, so no flow is needed for merging data created before login.
- **Data belongs to a household, not to a single user.** Everything is shared by all members and synced between their devices: saved recipes, meal plan, shopping lists and pantry. There is no personal data apart from the login itself.
- **Each user is in exactly one household.** There is no switching between households.
  - A new user automatically gets their own empty household.
  - **Joining** another household with an invite moves the user there. If they were the only member of a household that has data, warn first that the data will be deleted.
  - **Leaving** gives the user a new empty household. A household with no members left is deleted.
- **Invites** are a link containing a code, shared via the system share sheet. They expire after 7 days.
  - The link opens a simple web page that shows the code, and the user types it into the app ("Join with code"). No Android App Links or deep linking.
- **Permissions:** every member can edit all data and invite others. Only the household's creator can remove other members.
  - **When the creator leaves** (or deletes their account), the member who has been in the household the longest becomes the new creator.
- **Deleting an account:** users can delete their account in the Household tab. It needs their password. If they were the last member, the household and its data are deleted too.
- **The Household tab** (`src/app/(app)/household/`) is where the household is managed: name, members, invite, join with code, leave, and sign out.
  - It is the 5th and last tab, because Android allows at most 5. Account and future settings go here too.
  - The invite code is always shown on screen in a card (`InviteCard`), because the share sheet on Android lists only apps and hides the message.

**Decided: backend and login**

- **Own RESTful API in TypeScript on Node.js**, with a **PostgreSQL** database. Postgres mirrors the local SQLite schema almost 1:1, plus a `household_id` on household data.
- **The API enforces access:** every request is checked against the signed-in user's household, so nobody can read or change another household's data.
- **Hosting:** a Contabo VPS that the student rents.
  - The API and Postgres run in Docker.
  - **Caddy** sits in front as a reverse proxy and gets and renews Let's Encrypt certificates automatically, giving HTTPS. Only Caddy is exposed to the internet.
  - This needs a domain name pointing at the server.
- **Sign-in:**
  - Email and password. Passwords are hashed, never stored as plain text.
  - The API issues tokens (JWT) that the app stores securely and sends with each request.
  - No Apple or Google sign-in, since the app is not published.
- **Logout:**
  - Delete the local database, since the data is safe in the cloud.
  - Warn first if changes haven't been synced yet.

**Decided: repository layout**

- One git repository at `recipe-app/` with the Expo app in `mobile/` (this folder) and the API in `api/`. That way the app and the API can share TypeScript types.
- Run app commands (`npm test`, `npx expo ...`) from `mobile/`. Git commands work from anywhere in `recipe-app/`, and paths in git output start with `mobile/`.

**Decided: API framework**

- **Fastify.** The student chose it over Express, knowing it is harder to learn, because it is the more modern choice with built-in input validation and better TypeScript support. Explain Fastify concepts (plugins, hooks, schemas) as they come up.

**Decided: API libraries and local setup**

- **Validation:** Zod, plugged into Fastify with `fastify-type-provider-zod`. Schemas can be shared with the app, and `@fastify/swagger` can generate API docs from them.
- **Database access:** `pg` (node-postgres) with plain parameterized SQL in repository files, the same style as the app.
- **Passwords:** hashed with argon2.
- **Tokens:** JWT with `jose`.
- **Rate limiting:** `@fastify/rate-limit` on signup, login and token refresh.
- **Local Postgres:** installed natively with the official PostgreSQL installer for Windows. Docker is only used on the server.
- Check current docs and versions for each library before installing it.
- **Exact endpoints.** Write an API design for the student to review before building.

**Decided: sync and conflicts**

- **Own simple sync, not a sync framework.**
  - Push locally changed rows (`updated_at` after the last sync), and pull rows changed by others since the last sync.
  - Offline changes wait and are pushed later.
  - The API has endpoints for pushing changed rows and pulling rows changed since a given point.
- **Last write wins per row.** The server sets `updated_at` when it receives a change, because device clocks can't be trusted.
- **A soft delete beats a concurrent edit.**
- **Rows with a natural key get deterministic ids** derived from that key, so the same row created on two devices merges into one. This applies to pantry items (by ingredient name) and recipe ingredients (by recipe id + position). Rows that are meant to repeat, such as meal plan entries and shopping list items, keep random UUIDs.
- **Live updates** of the shopping list while family members shop at the same time are nice to have, not required. Add them last if there's time, e.g. with WebSockets, or simply by pulling changes often while the List tab is open.

**Decided: settings**

- None exist yet.
- New settings are **household-wide** by default, e.g. which day the week starts.
- Settings about the person or device, such as light/dark mode or notifications, are **personal**.

**What this means for code written now**

- Keep household data sync-ready (UUIDs, timestamps, soft deletes), as the data layer rules require.
- Local tables have no `user_id` or `household_id` column (decided). The local database only ever holds the signed-in user's household, and the API takes the household from the login, so the app never sends one.
- Make changes per row, e.g. tick off one item or remove one entry. Don't rewrite whole lists, so edits from different family members can be merged.
- Keep all data access in `src/repositories/` and `src/services/`, and open the database only in the root layout's `SQLiteProvider`. Then auth, the household database and sync can be added in one place.

**Decided: connecting the app (in progress)**

The plan, approved by the student, in five steps, each tested on the phone and committed separately:

1. ~~Local database ready for sync~~ Done: migration 003 (`change_number`, `needs_push`, triggers, `sync_state`) and name-based recipe ingredient ids.
2. ~~Login~~ Done: `expo-secure-store` for tokens, `services/api-client.ts` (refreshes on `token_expired`), `services/auth.ts`, sign-in and sign-up screens, all other screens behind login. The API URL is `EXPO_PUBLIC_API_URL` in `mobile/.env.local` (the computer's Wi-Fi IP while developing).
3. ~~Sync~~ Done: `services/sync.ts` pushes rows with `needs_push = 1`, then pulls all pages and applies them in one transaction, then refreshes screens. Runs on app start, on returning to the app, and a few seconds after a change. A pulled row doesn't overwrite a local row that still needs pushing; a row rejected as `deleted_on_server` is deleted locally.
4. ~~The Household tab~~ Done: name, members, invite (share sheet), join with code (with data loss warning), leave, remove member, sign out (warns about unsynced changes), delete account, sync status. Switching household empties the local data and pulls the new household's.
5. ~~Remove the web code~~ Cancelled: the app must work in a browser after all. Instead the web version got browser login storage, browser dialogs, and CORS in the API.

- **Data from before login is uploaded** to the household on the first sync (the student's choice). Migration 003 marks all existing rows `needs_push = 1`.

## Tech stack

- Expo + Expo Router, using Continuous Native Generation (no hand-edited `ios/`/`android/`)
- TypeScript in strict mode
- expo-sqlite for local storage
- Jest + React Native Testing Library (`jest-expo` preset, configured in `package.json`)

## Project structure

All app code lives under `src/` (import it via the `@/` alias). Only routes go in
`src/app/`; everything else stays outside it.

- `src/app/` – screens and routes (Expo Router)
- `src/components/` – reusable UI components
- `src/view-models/` – one hook per screen or feature (`use-pantry`, `use-week-plan`, ...)
- `src/hooks/` – small general-purpose hooks (`use-theme`, `use-layout`, `use-async-resource`, ...)
- `src/repositories/` – all SQL queries, one file per table or feature
- `src/db/` – database setup only: `initialize`, `migrations/`, the `Database` type and `useDatabase()`
- `src/services/` – talking to the outside world: TheMealDB client (later: own API, auth, sync)
- `src/types/` – shared TypeScript types
- `src/utils/` – pure functions (dates, ids, building the shopping list)
- `src/constants/theme.ts` – colors, fonts and spacing

### Layers

The app is split into layers (View → ViewModel → Repository / Service). Each layer only calls the layer below it.

Folders are **layer-first** (decided): one folder per layer, with feature subfolders only inside `components/`. This fits an app this size, makes the layers easy to show in the school report, and gives login and sync, which touch every feature, a natural home in `services/`. Reconsider feature-first folders only if a layer folder grows past ~15–20 files.

| Layer | Folder | Does | May import |
|---|---|---|---|
| View | `src/app/`, `src/components/` | Draws UI, shows alerts, navigates | view models, `hooks/`, `constants/`, `utils/`, `types/` |
| ViewModel | `src/view-models/` | Screen state and actions, loading via `useAsyncResource` | repositories, services, `useDatabase()`, other view models, `hooks/`, `utils/`, `types/` |
| Repository | `src/repositories/` | Reads and writes the local SQLite database | `db/`, `utils/`, `types/` |
| Service | `src/services/` | Network calls, maps responses to our types | `utils/`, `types/` |

- **Views never import `repositories/` or `db/`.** If a screen needs data, give it a view model. The only exception is the root layout, which opens the database.
- Exception: views may use pure URL helpers from services that don't fetch anything, such as `imageUrl()` and `ingredientImageUrl()`.
- View models return plain data and functions. They don't show alerts or navigate. They throw, and the view decides what to show (see `use-add-to-plan.ts` and `AddToPlanScreen`).
- Login and sync go in `services/` (e.g. `services/auth.ts`, `services/sync.ts`, a client for our own API). Sync reads and writes through repositories, so views don't change.

### Loose coupling

The student wants the code **loosely coupled**: each part knows as little as possible about how other parts work, so one part can change without breaking the others. In practice:

- **Depend on what a layer offers, not how it does it.** A view model calls `getPantryItems(db)` and gets `PantryItem[]`. It never knows about tables, columns or SQL. A view gets plain data and functions from its view model and never knows where the data came from.
- **Pass dependencies in instead of reaching for them.** Repository functions take the database as a parameter, typed against the small `Database` type in `src/db/types.ts`, not the concrete `SQLiteDatabase`. That is why the same code runs against `node:sqlite` in tests.
- **Map outside data to our own types at the edge.** Services turn TheMealDB (and later our own API) responses into types from `src/types/` right away, so a change in an outside API only touches its service file.
- **Shared types live in `src/types/`**, not in the layer that happens to create them.
- **No hidden shared state.** Don't use module-level variables or singletons that several files read and write. State lives in a view model or in the database.
- **Keep it simple.** Loose coupling here means clear boundaries and small interfaces, not extra machinery. Don't add dependency-injection containers, abstract base classes or interfaces with only one implementation "just in case".

## Code style

- Functional components and hooks only, no class components
- Prefer small, single-purpose functions and components (split if over ~150 lines)
- Descriptive names over comments; comment _why_, not _what_
- No `any`; define explicit types for props, DB rows and function return values
- Use early returns instead of deep nesting
- Named exports, except where Expo Router requires default exports
- Keep styles in `StyleSheet.create` at the bottom of the file

## Data layer rules

- Never write SQL inside components or view models; always go through functions in `src/repositories/`
- Use UUIDs as primary keys (no auto-increment), except recipes, which use `idMeal`
  - Rows with a natural key use a name-based UUID from `nameBasedUuid(IdNamespaces.x, key)` in `src/utils/ids.ts`, so the same row created on two devices merges on sync. Pantry items are keyed by their lowercased ingredient name, recipe ingredients by recipe id + position.
  - Adding a row that was soft-deleted restores it: upsert on the id and clear `deleted_at`. Don't insert a new row.
  - Every other row gets `randomUUID()`.
- **Shopping lists are derived, not stored.** There is one list per week (Monday to Sunday).
  - `buildShoppingList` (`src/utils/shopping-list.ts`) computes it from the week's planned ingredients, the pantry, and stored rows.
  - Only what the user does is stored in `shopping_list_items`: ticked-off lines and lines added by hand. Lines have name-based ids (week + lowercased ingredient name).
  - Changing the plan changes the list automatically. Ticked lines stay even if their dinner is removed.
  - Pantry ingredients are skipped and shown under "Already at home". "Need more" stores an unticked row, which puts the line back on the list.
  - **Ticking off** a line only puts it in the cart, so it's easy to undo while shopping. The pantry isn't touched.
  - **"Bought"** (`markCartBought`) moves everything in the week's cart into the pantry and empties the cart, in one transaction. Planned ingredients then show as "Already at home", and items added by hand disappear. Each line is a separate row update, so changes merge with other family members' ticks.
- **Exception:** the `ingredients` table is a cache of TheMealDB's ingredient list, not household data.
  - It is keyed by name, has only `updated_at`, and is never synced.
  - `useIngredientCatalog` downloads it once and refreshes it every 30 days.
- **Exception:** `sync_state` is device bookkeeping (e.g. the last pull's cursor), a key/value table that is never synced.
- **Sync columns** on the six synced tables (`SyncedTables` in `src/db/migrations/003-sync.ts`):
  - `needs_push = 1` means this device changed the row and hasn't uploaded it. **Triggers set it automatically** on every insert and update the app makes, so repository functions never touch it.
  - `change_number` is the server's number for the row, written only when applying pulled rows. That is how the triggers tell pulled rows apart: a pull always writes a new `change_number`, the app never does.
  - Clearing `needs_push` after a push changes the flag itself, so the triggers leave it alone.
- Every table has `created_at`, `updated_at` and `deleted_at` (soft deletes)
- Schema changes go through numbered migrations, never edit an existing migration
- Use parameterized queries only

How it is wired:

- **Startup:** `SQLiteProvider` in `src/app/_layout.tsx` opens `recipes.db` and runs `initializeDatabase` (`src/db/initialize.ts`) before any screen renders. `initializeDatabase` turns on WAL and foreign keys, then runs pending migrations. View models get it with `useDatabase()` (`src/db/use-database.ts`) and pass it to repository functions as a parameter. Only `use-database.ts` and the root layout import `expo-sqlite`.
- **Migrations** live in `src/db/migrations/` (`001-initial.ts`, ...) and are listed in order in `src/db/migrations/index.ts`.
  - Versions must be 1, 2, 3, ..., and `PRAGMA user_version` stores the current one.
  - All pending migrations run in one transaction together with the version update.
  - Add a new file to change the schema.
- **Type data-layer functions** against the `Database` type in `src/db/types.ts`, not `SQLiteDatabase`, so they run in tests.
- **Transactions:** use `withTransactionAsync`. `withExclusiveTransactionAsync` doesn't work on web and opens a new connection without foreign keys.
- **Column conventions:**
  - Timestamps are ISO 8601 UTC strings (`new Date().toISOString()`).
  - Calendar dates are `'YYYY-MM-DD'`.
  - Booleans are INTEGER 0/1.
  - Tables are `STRICT`.
  - Queries must filter out soft-deleted rows (`deleted_at IS NULL`).
- **Web** needs `metro.config.js` (`.wasm` assets and COEP/COOP headers in dev) and the same headers in the `expo-router` plugin options in `app.json` for deployed builds.

## UI rules

- Every screen handles loading, empty and error states
- Accessibility: set `accessibilityLabel` on interactive elements

### Responsive layout

The app runs on phones and tablets (`ios.supportsTablet`) in both portrait and landscape (`orientation: "default"`). On iPad the tab bar can turn into a sidebar (`sidebarAdaptable`).

- Every screen must work in four cases: compact (portrait phone, narrow iPad split view) and wide (landscape phone, tablet), each in portrait and landscape
- Base layout decisions on `useLayout()` from `src/hooks/use-layout.ts` (`isWide`, `isLandscape`, `width`, `gridColumns`). The breakpoint is `WideLayoutBreakpoint` in `src/constants/theme.ts`
- For card grids, measure the list's own width with `onLayout` and pass it to `getLayout()`, as `RecipeGrid` does. The iPad sidebar and split view make the content narrower than the window
- Don't use `Dimensions.get()` (it doesn't update on rotation) or device checks like `Device.deviceType`. Decide by available width, not by device type
- In wide layouts, use the space (grid columns, list and detail side by side). Don't just stretch the phone layout. Constrain reading content such as text and forms to `MaxContentWidth`
- **Pages with grids or columns** (Plan, List, Pantry) get their side padding from `getPageFrame(width, insets, maxWidth)` in `use-layout.ts`: the content is at most `MaxPageWidth` (1200) wide and centered, so header, search and content line up and nothing stretches across a big monitor.
  - Work out columns with `getGrid(contentWidth, { minItemWidth, gap, maxColumns })`, from a minimum card width that keeps text readable (e.g. 260 for a pantry item), not from fixed breakpoints.
  - Give grid items a fixed width (or `maxWidth` with `flex: 1` in a `FlatList`), so a lone item in the last row isn't stretched.
  - In browsers a scrollbar takes some of the measured width, so measure the grid container itself with `onLayout` when items wrap.
  - **Plan** (the student's choice): narrow screens show a card per day (`PlanDayCard`); from 640 content width each day is a row across the page (`PlanDayRow`): the day left, its dinners side by side, "+ Add" right, like an agenda. Both use the shared pieces in `plan-day-parts.tsx`.
  - **List:** two equally wide columns only when "In cart" or "Already at home" has something. Then headings and rows get the same heights (`isAligned`), so they line up across the columns.
- Respect safe areas in landscape, where the notch and home indicator move to the sides

## Testing

- Write tests for all functions in `src/repositories/` and `src/services/`, and for non-trivial hooks and view models
- Test behavior, not implementation details
- Put tests in `src/__tests__/`
- `jest-expo` replaces native modules with mocks, so native calls such as `expo-crypto`'s
  `randomUUID()` or `expo-sqlite` return nothing in tests. Mock them explicitly
- **Database tests:** use `createTestDatabase()` from `jest/node-sqlite-database.ts`, then `initializeDatabase(db)`.
  - It runs the real SQL against an in-memory database through Node's built-in `node:sqlite`. Node prints an "ExperimentalWarning" for it, which is expected.
  - Don't mock `expo-sqlite` for data-layer tests.
- Helpers shared by tests live in `jest/`, not `src/__tests__/`, because every file in `__tests__` is run as a test

## Working with me

- Propose a plan before larger changes
- Make small, focused changes; don't refactor unrelated code
- Ask if requirements are unclear instead of guessing

## Design

- Clean, minimal UI with plenty of whitespace
- Colors and spacing come from `src/constants/theme.ts` – never hardcode values
- Support light and dark mode
- **Warm, family-friendly palette (the student's choice):** cream backgrounds, sand elements, warm browns for text, and a terracotta `accent` (with `onAccent` for text on it).
  - Use `accent` only for the main action (`PrimaryButton`), the "Today" badge and the selected tab. Everything else stays calm.
  - Keep text at **4.5:1 contrast** or more (WCAG AA). Terracotta text on the sand colors doesn't reach that, so there the accent goes on icons only (they need 3:1).
  - Headers use the same colors through `NavigationThemes` in `theme.ts`.

## Product

English-language app that helps families with children plan dinners,
shop for groceries and keep track of ingredients at home.
Recipes and ingredients come from TheMealDB API.

### Tabs

1. **Recipes** – search TheMealDB and save favorite recipes
2. **Plan** – organize saved recipes into a weekly dinner plan
3. **List** – the week's shopping list, which follows the plan, minus what's in the pantry
4. **Pantry** – ingredients the family has at home
5. **Household** – the family's members, invites and account

### Core flow

Save recipe → add to plan → shopping list follows the plan (skipping pantry items)
→ tick items into the cart while shopping → "Bought" moves the cart to the pantry.

### Target users

Busy parents. Prioritize speed and simplicity: few taps, large touch targets,
clear labels, no clutter.

## TheMealDB

- Base URL: `https://www.themealdb.com/api/json/v1/1/` (free test key `1`)
- All TheMealDB calls go through `src/services/mealdb.ts`; never call fetch from components
- Map API responses to our own types right away; the rest of the app
  never sees the raw API shape
- Ingredients and measures come as `strIngredient1..20` / `strMeasure1..20`;
  convert them to an array and drop empty entries
- Saved recipes are copied into SQLite so they work offline
- See `docs/themealdb.md` for endpoints

## Current decisions (may change)

These are working decisions, not final. Follow them for now, but tell me
if you think one should change instead of silently working around it.

- **Ingredient matching:** Pantry and shopping list items use TheMealDB
  ingredient names (from `list.php?i=list`) so recipe ingredients can be
  matched against the pantry. Users pick ingredients from this list rather
  than typing free text.
- **Measures:** TheMealDB measures are free text ("1 cup", "a pinch").
  Store and display them as-is. Do not try to parse, convert or sum them.
  If the same ingredient appears in several recipes, list each measure
  separately on the shopping list.
- **IDs:** Recipes use TheMealDB's `idMeal` as their ID. All our own tables
  use UUIDs stored as `TEXT`, to support cloud sync later. Name-based UUIDs are
  used where a row has a natural key: pantry items, shopping lists and list
  lines. Other rows use `randomUUID()`. See "Data layer rules".
