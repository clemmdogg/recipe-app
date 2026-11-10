# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

This is the mobile client of a recipe app (`recipe-app/mobile`), built on Expo SDK 58, React Native 0.88, React 19.3 and TypeScript 6. The starter demo content has been removed. The four tabs exist, but each one is still a placeholder `EmptyState` screen.

`expo-sqlite` is installed and registered as a config plugin in `app.json` but not used yet, so local persistence is expected to use it.

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
- **Tabs**: Each tab is a folder in `src/app/` with its own `_layout.tsx` (a `Stack`) and `index.tsx`. Detail screens for a tab go in the same folder.
  - Recipes is the `(recipes)` route group, so its `index.tsx` is the app's start route `/`. Plan, List and Pantry are at `/plan`, `/list` and `/pantry`.
  - The tab bar is defined once in `src/constants/tabs.ts` (`TabRoutes`: route name, href, label, SF Symbol and Material icon). Add or change tabs there, not in the tab bar components.
- **Platform-split files**: `.web.tsx` / `.web.ts` variants override the native files of the same name.
  - `app-tabs.tsx` uses native tabs (`expo-router/native-tabs`). Its triggers match on route `name`.
  - `app-tabs.web.tsx` builds a bottom tab bar with `expo-router/ui` (`Tabs`/`TabList`/`TabTrigger`). Its triggers use `name` plus `href`.
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
  - Feature hooks such as `use-recipe-browser.ts` and `use-recipe-details.ts` combine it with the API and `src/db/` functions. Screens stay thin.
- **Shared UI states**: `LoadingState`, `ErrorState` (with an optional retry) and `EmptyState` in `src/components/`.
- **Detail screens** live inside their tab's folder, e.g. `src/app/(recipes)/recipe/[id].tsx` is `/recipe/[id]`. Link to them with the object form: `{ pathname: '/recipe/[id]', params: { id } }`.
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
- `src/api/` – TheMealDB client
- `src/db/` – all database access (schema, migrations, queries)
- `src/hooks/` – custom hooks
- `src/types/` – shared TypeScript types
- `src/constants/theme.ts` – colors, fonts and spacing

## Code style

- Functional components and hooks only, no class components
- Prefer small, single-purpose functions and components (split if over ~150 lines)
- Descriptive names over comments; comment _why_, not _what_
- No `any`; define explicit types for props, DB rows and function return values
- Use early returns instead of deep nesting
- Named exports, except where Expo Router requires default exports
- Keep styles in `StyleSheet.create` at the bottom of the file

## Data layer rules

- Never write SQL inside components; always go through functions in `src/db/`
- Use UUIDs as primary keys (no auto-increment), except recipes, which use `idMeal`
- Every table has `created_at`, `updated_at` and `deleted_at` (soft deletes)
- Schema changes go through numbered migrations, never edit an existing migration
- Use parameterized queries only

How it is wired:

- **Startup:** `SQLiteProvider` in `src/app/_layout.tsx` opens `recipes.db` and runs `initializeDatabase` (`src/db/initialize.ts`) before any screen renders. `initializeDatabase` turns on WAL and foreign keys, then runs pending migrations. Query functions take the database from `useSQLiteContext()` as a parameter.
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
- Respect safe areas in landscape, where the notch and home indicator move to the sides

## Testing

- Write tests for all functions in `src/db/` and for non-trivial hooks
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

## Product

English-language app that helps families with children plan dinners,
shop for groceries and keep track of ingredients at home.
Recipes and ingredients come from TheMealDB API.

### Tabs

1. **Recipes** – search TheMealDB and save favorite recipes
2. **Plan** – organize saved recipes into a weekly dinner plan
3. **List** – shopping lists generated from the plan, minus what's in the pantry
4. **Pantry** – ingredients the family has at home

### Core flow

Save recipe → add to plan → generate shopping list (skipping pantry items)
→ checked-off items move to pantry.

### Target users

Busy parents. Prioritize speed and simplicity: few taps, large touch targets,
clear labels, no clutter.

## TheMealDB

- Base URL: `https://www.themealdb.com/api/json/v1/1/` (free test key `1`)
- All API calls go through `src/api/mealdb.ts`; never call fetch from components
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
  (plans, shopping lists, list items, pantry) use UUIDs (`expo-crypto`
  `randomUUID()`), stored as `TEXT`, to support cloud sync later.
