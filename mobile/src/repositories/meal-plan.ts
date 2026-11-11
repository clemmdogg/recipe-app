import { randomUUID } from 'expo-crypto';

import type { Database } from '@/db/types';
import { isRecipeSaved, saveRecipe } from '@/repositories/recipes';
import type { MealPlanEntry } from '@/types/meal-plan';
import type { Recipe } from '@/types/recipe';
import type { DateKey } from '@/utils/dates';

type EntryRow = {
  id: string;
  date: string;
  recipe_id: string;
  name: string;
  category: string | null;
  area: string | null;
  thumbnail_url: string | null;
};

/**
 * Plans a recipe for a day. The recipe must already be in the `recipes` table
 * (save it first). Returns the new entry's id.
 */
export async function addToPlan(
  db: Database,
  recipeId: string,
  date: DateKey,
  now = new Date()
): Promise<string> {
  const id = randomUUID();
  const timestamp = now.toISOString();
  await db.runAsync(
    `INSERT INTO meal_plan_entries (id, date, recipe_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    id,
    date,
    recipeId,
    timestamp,
    timestamp
  );
  return id;
}

/**
 * Plans a recipe that may not be saved yet, e.g. from a search result. Saves it first,
 * because the plan needs the recipe offline.
 */
export async function planRecipe(
  db: Database,
  recipe: Recipe,
  date: DateKey,
  now = new Date()
): Promise<string> {
  if (!(await isRecipeSaved(db, recipe.id))) {
    await saveRecipe(db, recipe, now);
  }
  return addToPlan(db, recipe.id, date, now);
}

/** Soft-deletes a plan entry. The recipe itself stays saved. */
export async function removeFromPlan(db: Database, entryId: string, now = new Date()): Promise<void> {
  const timestamp = now.toISOString();
  await db.runAsync(
    'UPDATE meal_plan_entries SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    timestamp,
    timestamp,
    entryId
  );
}

/**
 * Planned dinners from `startDate` to `endDate` (inclusive), by date, then in the order they
 * were added. Includes recipes that have since been removed from the saved list.
 */
export async function getPlan(
  db: Database,
  startDate: DateKey,
  endDate: DateKey
): Promise<MealPlanEntry[]> {
  const rows = await db.getAllAsync<EntryRow>(
    `SELECT e.id, e.date, e.recipe_id, r.name, r.category, r.area, r.thumbnail_url
     FROM meal_plan_entries e
     JOIN recipes r ON r.id = e.recipe_id
     WHERE e.deleted_at IS NULL AND e.date BETWEEN ? AND ?
     ORDER BY e.date, e.created_at, e.id`,
    startDate,
    endDate
  );
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    recipe: {
      id: row.recipe_id,
      name: row.name,
      category: row.category,
      area: row.area,
      thumbnailUrl: row.thumbnail_url,
    },
  }));
}

/** Dates on or after `fromDate` that have this recipe planned, without duplicates. */
export async function getPlannedDates(
  db: Database,
  recipeId: string,
  fromDate: DateKey
): Promise<DateKey[]> {
  const rows = await db.getAllAsync<{ date: string }>(
    `SELECT DISTINCT date FROM meal_plan_entries
     WHERE recipe_id = ? AND date >= ? AND deleted_at IS NULL
     ORDER BY date`,
    recipeId,
    fromDate
  );
  return rows.map((row) => row.date);
}
