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
- **Theming**: `src/constants/theme.ts` defines `Colors` (light/dark), `Fonts` (per platform, and on web it points to CSS variables in `src/global.css`), `Spacing` and `MaxContentWidth`. Use `useTheme()` or the `ThemedText`/`ThemedView` components (`type`/`themeColor` props) instead of hard-coding colors.
- **Path aliases**: `@/*` maps to `src/*`, and `@/assets/*` maps to `assets/*`.
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

## UI rules

- Every screen handles loading, empty and error states
- Accessibility: set `accessibilityLabel` on interactive elements

## Testing

- Write tests for all functions in `src/db/` and for non-trivial hooks
- Test behavior, not implementation details
- Put tests in `src/__tests__/`
- `jest-expo` replaces native modules with mocks, so native calls such as `expo-crypto`'s
  `randomUUID()` or `expo-sqlite` return nothing in tests. Mock them explicitly

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
