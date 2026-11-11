# TheMealDB API

Notes on the parts of [TheMealDB](https://www.themealdb.com/api.php) this app uses. The client is `src/services/mealdb.ts`.

Real responses used as test fixtures are in `jest/fixtures/`.

## License and key

- Base URL: `https://www.themealdb.com/api/json/v1/1`. The `1` is the free test key.
- TheMealDB allows the test key "during development of your app or for educational use". **You must become a supporter (paid) before releasing the app publicly on an app store.** Supporters get their own key, which replaces `1` in the URL.
- No rate limit is documented.

## Endpoints

### Used now

| Purpose | Path | Notes |
|---|---|---|
| Search by name | `/search.php?s={query}` | Full meal objects |
| Look up by id | `/lookup.php?i={idMeal}` | Full meal object |
| Recipes in a category | `/filter.php?c={category}` | Summaries only (see below) |
| Category names | `/list.php?c=list` | `{ meals: [{ strCategory }] }`, alphabetical. The key is `meals`, not `categories` |

### Available but not used yet

| Purpose | Path |
|---|---|
| Recipes with an ingredient | `/filter.php?i={ingredient}` (one ingredient only) |
| Recipes from a cuisine | `/filter.php?a={area}` |
| All ingredient names | `/list.php?i=list` (for pantry matching) |
| All cuisines | `/list.php?a=list` |
| Categories with images and descriptions | `/categories.php` |
| Random recipe | `/random.php` |
| Recipes by first letter | `/search.php?f={letter}` |

Supporter-only (v2 API): multi-ingredient filter, latest meals, random selection of 10.

## Response shapes

- **Everything is wrapped in `{ "meals": [...] }`.** No results returns `{ "meals": null }` with HTTP 200, not an empty array or a 404.
- **Full meal objects** (search, lookup) have 54 string fields. The ones we use:
  - `idMeal`, `strMeal`
  - `strCategory`
  - `strArea` (cuisine, e.g. "Italian") and `strCountry` (e.g. "Italy")
  - `strInstructions`: steps separated by `\r\n`
  - `strMealThumb`, `strYoutube`, `strSource`
  - `strIngredient1..20` and `strMeasure1..20`
- **Empty values** can be `null` or `""`. In practice, unused ingredient slots are `""` up to slot 15 and `null` for 16–20. Used values can have trailing spaces, e.g. `"1 tin "`. The client trims everything and treats empty strings as missing.
- **Filter results** (`filter.php`) only have `idMeal`, `strMeal`, `strMealThumb`, `strArea` and `strCountry`. There is no category, no instructions and no ingredients. Open the recipe with `lookup.php` to get the rest.
- **`strArea` is sometimes `null` while `strCountry` is set.** The app shows the cuisine when there is one, and otherwise the country.

## Images

Append a size to a meal image URL to get a smaller version: `/small`, `/medium` or `/large`. Use `imageUrl()` in `src/services/mealdb.ts`.

| Suffix | Approx. size (Nov 2026 test) | Used for |
|---|---|---|
| (none) | 97 KB | — |
| `/large` | 41 KB | Recipe screen |
| `/medium` | 25 KB | Recipe cards |
| `/small` (same as `/preview`) | 7 KB | — |

Ingredient images: `https://www.themealdb.com/images/ingredients/{Name}.png`, with `-small`, `-medium` or `-large` before `.png`. Not used yet, and not verified.
