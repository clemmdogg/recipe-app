export type Ingredient = {
  /** TheMealDB ingredient name, e.g. "olive oil". Used to match against the pantry. */
  name: string;
  /** Free text such as "1/4 cup" or "a pinch". Stored and shown as-is, never parsed. */
  measure: string;
};

export type Recipe = {
  /** TheMealDB `idMeal`. */
  id: string;
  name: string;
  category: string | null;
  /** Cuisine (e.g. "Italian") or, when TheMealDB has none, the country of origin. */
  area: string | null;
  instructions: string | null;
  thumbnailUrl: string | null;
  youtubeUrl: string | null;
  sourceUrl: string | null;
  ingredients: Ingredient[];
};

/** What lists and cards need. Category filter results from TheMealDB only include this much. */
export type RecipeSummary = Pick<Recipe, 'id' | 'name' | 'category' | 'area' | 'thumbnailUrl'>;
