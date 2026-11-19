import filterSeafood from '../../jest/fixtures/mealdb-filter-seafood.json';
import listCategories from '../../jest/fixtures/mealdb-list-categories.json';
import listIngredients from '../../jest/fixtures/mealdb-list-ingredients.json';
import searchArrabiata from '../../jest/fixtures/mealdb-search-arrabiata.json';

import {
  getCategories,
  getIngredients,
  getRandomRecipe,
  getRecipe,
  ingredientImageUrl,
  getRecipesByCategory,
  imageUrl,
  MealDbError,
  searchRecipes,
} from '@/services/mealdb';

const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

function respondWith(body: unknown, status = 200) {
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

function requestedUrl(): string {
  return String(fetchMock.mock.calls[0][0]);
}

describe('searchRecipes', () => {
  it('maps TheMealDB meals to recipes', async () => {
    respondWith(searchArrabiata);

    const [recipe] = await searchRecipes('Arrabiata');

    expect(recipe).toMatchObject({
      id: '52771',
      name: 'Spicy Arrabiata Penne',
      category: 'Vegetarian',
      area: 'Italian',
      thumbnailUrl: 'https://www.themealdb.com/images/media/meals/ustsqw1468250014.jpg',
      youtubeUrl: 'https://www.youtube.com/watch?v=1IszT_guI08',
      sourceUrl: null,
    });
    expect(recipe.instructions).toMatch(/^Bring a large pot of water to a boil/);
  });

  it('turns numbered ingredient fields into a trimmed list without empty slots', async () => {
    respondWith(searchArrabiata);

    const [recipe] = await searchRecipes('Arrabiata');

    expect(recipe.ingredients).toHaveLength(8);
    expect(recipe.ingredients[0]).toEqual({ name: 'penne rigate', measure: '1 pound' });
    // The raw measure is "1 tin " with a trailing space.
    expect(recipe.ingredients[3]).toEqual({ name: 'chopped tomatoes', measure: '1 tin' });
  });

  it('returns an empty list when nothing matches', async () => {
    respondWith({ meals: null });

    await expect(searchRecipes('zzzzqqq')).resolves.toEqual([]);
  });

  it('does not call the API for a blank query', async () => {
    await expect(searchRecipes('   ')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('encodes the query', async () => {
    respondWith({ meals: null });

    await searchRecipes(' mac & cheese ');

    expect(requestedUrl()).toBe(
      'https://www.themealdb.com/api/json/v1/1/search.php?s=mac%20%26%20cheese'
    );
  });
});

describe('getRecipe', () => {
  it('returns the recipe with the given id', async () => {
    respondWith(searchArrabiata);

    await expect(getRecipe('52771')).resolves.toMatchObject({ id: '52771' });
    expect(requestedUrl()).toContain('/lookup.php?i=52771');
  });

  it('returns null for an unknown id', async () => {
    respondWith({ meals: null });

    await expect(getRecipe('0')).resolves.toBeNull();
  });
});

describe('getRandomRecipe', () => {
  it('returns the random recipe TheMealDB picked', async () => {
    respondWith(searchArrabiata);

    await expect(getRandomRecipe()).resolves.toMatchObject({ id: '52771' });
    expect(requestedUrl()).toContain('/random.php');
  });

  it('fails clearly when TheMealDB sends no recipe', async () => {
    respondWith({ meals: null });

    await expect(getRandomRecipe()).rejects.toBeInstanceOf(MealDbError);
  });
});

describe('getRecipesByCategory', () => {
  it('maps filter results to summaries with the requested category', async () => {
    respondWith(filterSeafood);

    const recipes = await getRecipesByCategory('Seafood');

    expect(recipes).toHaveLength(3);
    expect(recipes[2]).toEqual({
      id: '53147',
      name: 'Arroz con gambas y calamar',
      category: 'Seafood',
      area: 'Spanish',
      thumbnailUrl: 'https://www.themealdb.com/images/media/meals/jc6oub1763196663.jpg',
    });
  });

  it('falls back to the country when the cuisine is missing', async () => {
    respondWith(filterSeafood);

    const [recipe] = await getRecipesByCategory('Seafood');

    expect(recipe.area).toBe('Brazil');
  });
});

describe('getCategories', () => {
  it('returns category names', async () => {
    respondWith(listCategories);

    const categories = await getCategories();

    expect(categories).toContain('Chicken');
    expect(categories).toContain('Vegetarian');
    expect(categories).toHaveLength(listCategories.meals.length);
  });
});

describe('getIngredients', () => {
  it('returns names and types without descriptions', async () => {
    respondWith(listIngredients);

    const ingredients = await getIngredients();

    expect(ingredients).toHaveLength(listIngredients.meals.length);
    expect(ingredients).toContainEqual({ name: 'Puff Pastry', type: 'Pastry' });
  });

  it('keeps ingredients that have no type', async () => {
    respondWith(listIngredients);

    const ingredients = await getIngredients();

    expect(ingredients).toContainEqual({ name: 'Chicken', type: null });
  });

  it('builds a small image URL, encoding spaces', () => {
    expect(ingredientImageUrl('Olive Oil')).toBe(
      'https://www.themealdb.com/images/ingredients/Olive%20Oil-small.png'
    );
  });
});

describe('errors', () => {
  it('reports a network failure as a MealDbError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    await expect(searchRecipes('chicken')).rejects.toThrow(MealDbError);
  });

  it('reports a server error as a MealDbError', async () => {
    respondWith({}, 500);

    await expect(searchRecipes('chicken')).rejects.toThrow(/status 500/);
  });

  it('passes an abort through instead of reporting a network failure', async () => {
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    await expect(searchRecipes('chicken', controller.signal)).rejects.not.toThrow(MealDbError);
  });
});

describe('imageUrl', () => {
  it('appends the size suffix', () => {
    expect(imageUrl('https://example.com/meal.jpg', 'medium')).toBe(
      'https://example.com/meal.jpg/medium'
    );
  });

  it('keeps a missing image missing', () => {
    expect(imageUrl(null, 'small')).toBeNull();
  });
});
