import type { Database } from '@/db/types';
import type { Ingredient, Recipe, RecipeSummary } from '@/types/recipe';
import { IdNamespaces, nameBasedUuid } from '@/utils/ids';

type RecipeRow = {
  id: string;
  name: string;
  category: string | null;
  area: string | null;
  instructions: string | null;
  thumbnail_url: string | null;
  youtube_url: string | null;
  source_url: string | null;
};

type IngredientRow = {
  ingredient_name: string;
  measure: string;
};

/**
 * Saves a copy of the recipe so it works offline. Saving again (or after removing it)
 * refreshes the copy and replaces its ingredients.
 */
export async function saveRecipe(db: Database, recipe: Recipe, now = new Date()): Promise<void> {
  const timestamp = now.toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO recipes
         (id, name, category, area, instructions, thumbnail_url, youtube_url, source_url,
          created_at, updated_at, deleted_at)
       VALUES ($id, $name, $category, $area, $instructions, $thumbnailUrl, $youtubeUrl, $sourceUrl,
               $now, $now, NULL)
       ON CONFLICT (id) DO UPDATE SET
         name = excluded.name,
         category = excluded.category,
         area = excluded.area,
         instructions = excluded.instructions,
         thumbnail_url = excluded.thumbnail_url,
         youtube_url = excluded.youtube_url,
         source_url = excluded.source_url,
         updated_at = excluded.updated_at,
         deleted_at = NULL`,
      {
        $id: recipe.id,
        $name: recipe.name,
        $category: recipe.category,
        $area: recipe.area,
        $instructions: recipe.instructions,
        $thumbnailUrl: recipe.thumbnailUrl,
        $youtubeUrl: recipe.youtubeUrl,
        $sourceUrl: recipe.sourceUrl,
        $now: timestamp,
      }
    );

    const ids: string[] = [];
    for (const [index, ingredient] of recipe.ingredients.entries()) {
      const position = index + 1;
      const id = await recipeIngredientId(recipe.id, position);
      ids.push(id);
      await db.runAsync(
        `INSERT INTO recipe_ingredients
           (id, recipe_id, position, ingredient_name, measure, created_at, updated_at)
         VALUES ($id, $recipeId, $position, $name, $measure, $now, $now)
         ON CONFLICT (id) DO UPDATE SET
           ingredient_name = excluded.ingredient_name,
           measure = excluded.measure,
           updated_at = excluded.updated_at,
           deleted_at = NULL`,
        {
          $id: id,
          $recipeId: recipe.id,
          $position: position,
          $name: ingredient.name,
          $measure: ingredient.measure,
          $now: timestamp,
        }
      );
    }

    // Ingredients the recipe no longer has, including rows with random ids from older versions.
    await db.runAsync(
      `UPDATE recipe_ingredients SET deleted_at = $now, updated_at = $now
       WHERE recipe_id = $recipeId AND deleted_at IS NULL
         AND id NOT IN (SELECT value FROM json_each($ids))`,
      { $now: timestamp, $recipeId: recipe.id, $ids: JSON.stringify(ids) }
    );
  });
}

/**
 * Name-based, from the recipe id and position, so the same recipe saved on two devices gets
 * the same ingredient ids and merges on sync instead of being duplicated.
 */
function recipeIngredientId(recipeId: string, position: number): Promise<string> {
  return nameBasedUuid(IdNamespaces.recipeIngredient, `${recipeId}/${position}`);
}

/** Soft-deletes the saved recipe. Meal plan entries that point to it keep working. */
export async function removeRecipe(db: Database, id: string, now = new Date()): Promise<void> {
  const timestamp = now.toISOString();
  await db.runAsync(
    'UPDATE recipes SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    timestamp,
    timestamp,
    id
  );
}

/** Saved recipes, most recently saved first. */
export async function getSavedRecipes(db: Database): Promise<RecipeSummary[]> {
  const rows = await db.getAllAsync<RecipeRow>(
    `SELECT id, name, category, area, instructions, thumbnail_url, youtube_url, source_url
     FROM recipes WHERE deleted_at IS NULL
     ORDER BY updated_at DESC, name`
  );
  return rows.map((row) => {
    const { id, name, category, area, thumbnailUrl } = toRecipe(row, []);
    return { id, name, category, area, thumbnailUrl };
  });
}

export async function getSavedRecipe(db: Database, id: string): Promise<Recipe | null> {
  const row = await db.getFirstAsync<RecipeRow>(
    `SELECT id, name, category, area, instructions, thumbnail_url, youtube_url, source_url
     FROM recipes WHERE id = ? AND deleted_at IS NULL`,
    id
  );
  if (!row) {
    return null;
  }
  const ingredientRows = await db.getAllAsync<IngredientRow>(
    `SELECT ingredient_name, measure FROM recipe_ingredients
     WHERE recipe_id = ? AND deleted_at IS NULL
     ORDER BY position`,
    id
  );
  return toRecipe(row, ingredientRows);
}

export async function isRecipeSaved(db: Database, id: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM recipes WHERE id = ? AND deleted_at IS NULL',
    id
  );
  return row !== null;
}

function toRecipe(row: RecipeRow, ingredientRows: IngredientRow[]): Recipe {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    area: row.area,
    instructions: row.instructions,
    thumbnailUrl: row.thumbnail_url,
    youtubeUrl: row.youtube_url,
    sourceUrl: row.source_url,
    ingredients: ingredientRows.map(
      (ingredient): Ingredient => ({ name: ingredient.ingredient_name, measure: ingredient.measure })
    ),
  };
}
