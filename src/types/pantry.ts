/** An ingredient from TheMealDB's ingredient list. */
export type CatalogIngredient = {
  name: string;
  /** TheMealDB's grouping, e.g. "Vegetable" or "Spice". Often missing. */
  type: string | null;
};

/** An ingredient the household has at home. */
export type PantryItem = {
  /** Name-based UUID of the lowercased ingredient name, so it merges across devices. */
  id: string;
  /** TheMealDB ingredient name, matched case-insensitively against recipe ingredients. */
  name: string;
};
