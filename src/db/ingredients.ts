import type { Database } from '@/db/types';
import type { CatalogIngredient } from '@/types/pantry';

const InsertBatchSize = 200;

/** Replaces the local copy of TheMealDB's ingredient list. */
export async function replaceIngredientCatalog(
  db: Database,
  ingredients: CatalogIngredient[],
  now = new Date()
): Promise<void> {
  const timestamp = now.toISOString();
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM ingredients');
    // Insert in batches: one statement per ingredient is slow for about 1000 rows.
    for (let start = 0; start < ingredients.length; start += InsertBatchSize) {
      const batch = ingredients.slice(start, start + InsertBatchSize);
      const placeholders = batch.map(() => '(?, ?, ?)').join(', ');
      const params = batch.flatMap((ingredient) => [ingredient.name, ingredient.type, timestamp]);
      await db.runAsync(
        `INSERT OR REPLACE INTO ingredients (name, type, updated_at) VALUES ${placeholders}`,
        params
      );
    }
  });
}

/** When the ingredient list was last downloaded, or null if it never was. */
export async function getIngredientCatalogUpdatedAt(db: Database): Promise<Date | null> {
  const row = await db.getFirstAsync<{ updated_at: string | null }>(
    'SELECT MAX(updated_at) AS updated_at FROM ingredients'
  );
  return row?.updated_at ? new Date(row.updated_at) : null;
}

/**
 * Ingredients whose name contains `query`, ignoring case. Names that start with the query
 * come first, then shorter names, so "gar" suggests "Garlic" before "Cigars".
 */
export async function searchIngredients(
  db: Database,
  query: string,
  limit = 8
): Promise<CatalogIngredient[]> {
  const trimmed = query.trim();
  if (trimmed === '') {
    return [];
  }
  // Escape LIKE wildcards so "%" and "_" in the query match literally.
  const pattern = trimmed.replace(/[\\%_]/g, (character) => `\\${character}`);
  return db.getAllAsync<CatalogIngredient>(
    `SELECT name, type FROM ingredients
     WHERE name LIKE '%' || $pattern || '%' ESCAPE '\\'
     ORDER BY CASE WHEN name LIKE $pattern || '%' ESCAPE '\\' THEN 0 ELSE 1 END,
              length(name), name
     LIMIT $limit`,
    { $pattern: pattern, $limit: limit }
  );
}
