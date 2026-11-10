import type { Ingredient, Recipe, RecipeSummary } from '@/types/recipe';

// Free test key "1": fine for development, but TheMealDB requires becoming a supporter
// before releasing on an app store. See docs/themealdb.md.
const BaseUrl = 'https://www.themealdb.com/api/json/v1/1';
const MaxIngredients = 20;

export class MealDbError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'MealDbError';
  }
}

type RawMeal = Record<string, string | null | undefined>;
type MealsResponse = { meals: RawMeal[] | null };

export async function searchRecipes(query: string, signal?: AbortSignal): Promise<Recipe[]> {
  const trimmed = query.trim();
  if (trimmed === '') {
    return [];
  }
  const data = await getJson<MealsResponse>(`/search.php?s=${encodeURIComponent(trimmed)}`, signal);
  return (data.meals ?? []).map(toRecipe);
}

export async function getRecipe(id: string, signal?: AbortSignal): Promise<Recipe | null> {
  const data = await getJson<MealsResponse>(`/lookup.php?i=${encodeURIComponent(id)}`, signal);
  const [meal] = data.meals ?? [];
  return meal ? toRecipe(meal) : null;
}

export async function getRecipesByCategory(
  category: string,
  signal?: AbortSignal
): Promise<RecipeSummary[]> {
  const data = await getJson<MealsResponse>(`/filter.php?c=${encodeURIComponent(category)}`, signal);
  // Filter results don't include the category, but we know it from the request.
  return (data.meals ?? []).map((meal) => ({ ...toSummary(meal), category }));
}

export async function getCategories(signal?: AbortSignal): Promise<string[]> {
  const data = await getJson<MealsResponse>('/list.php?c=list', signal);
  return (data.meals ?? []).map((item) => clean(item.strCategory)).filter(isPresent);
}

/** TheMealDB serves smaller variants by appending `/small`, `/medium` or `/large` to an image URL. */
export function imageUrl(url: string | null, size: 'small' | 'medium' | 'large'): string | null {
  return url ? `${url}/${size}` : null;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BaseUrl}${path}`, { signal });
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    throw new MealDbError('Could not reach TheMealDB. Check your internet connection.', {
      cause: error,
    });
  }
  if (!response.ok) {
    throw new MealDbError(`TheMealDB responded with status ${response.status}.`);
  }
  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new MealDbError('TheMealDB sent a response that could not be read.', { cause: error });
  }
}

function toSummary(meal: RawMeal): RecipeSummary {
  const id = clean(meal.idMeal);
  const name = clean(meal.strMeal);
  if (!id || !name) {
    throw new MealDbError('TheMealDB sent a recipe without an id or name.');
  }
  return {
    id,
    name,
    category: clean(meal.strCategory),
    area: clean(meal.strArea) ?? clean(meal.strCountry),
    thumbnailUrl: clean(meal.strMealThumb),
  };
}

function toRecipe(meal: RawMeal): Recipe {
  return {
    ...toSummary(meal),
    instructions: clean(meal.strInstructions),
    youtubeUrl: clean(meal.strYoutube),
    sourceUrl: clean(meal.strSource),
    ingredients: toIngredients(meal),
  };
}

/** Turns strIngredient1..20 / strMeasure1..20 into a list, dropping empty slots. */
function toIngredients(meal: RawMeal): Ingredient[] {
  const ingredients: Ingredient[] = [];
  for (let slot = 1; slot <= MaxIngredients; slot++) {
    const name = clean(meal[`strIngredient${slot}`]);
    if (name) {
      ingredients.push({ name, measure: clean(meal[`strMeasure${slot}`]) ?? '' });
    }
  }
  return ingredients;
}

/** Trims text and turns TheMealDB's empty values ("", whitespace, null) into null. */
function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}
