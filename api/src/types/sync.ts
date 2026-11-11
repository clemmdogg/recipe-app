import { z } from 'zod';

/*
 * The shape of every synced row, in one place. Routes use these schemas to check requests and
 * responses, and services use the inferred types. The app can import them later, so both sides
 * always agree on the data.
 */

const RecipeId = z.string().min(1).max(64).describe("TheMealDB's idMeal");
const Text = (max: number) => z.string().max(max);
const RequiredText = (max: number) => z.string().trim().min(1).max(max);
const OptionalText = (max: number) => z.string().max(max).nullable();
const IngredientName = RequiredText(200);
const Measure = Text(200);

/** Each table's id and its own data fields (everything except the sync bookkeeping). */
const Tables = {
  recipes: {
    id: RecipeId,
    fields: z.object({
      name: RequiredText(200),
      category: OptionalText(100),
      area: OptionalText(100),
      instructions: OptionalText(20_000),
      thumbnailUrl: OptionalText(2000),
      youtubeUrl: OptionalText(2000),
      sourceUrl: OptionalText(2000),
    }),
  },
  recipeIngredients: {
    id: z.uuid(),
    fields: z.object({
      recipeId: RecipeId,
      position: z.number().int().min(0).max(1000),
      ingredientName: IngredientName,
      measure: Measure,
    }),
  },
  mealPlanEntries: {
    id: z.uuid(),
    fields: z.object({
      date: z.iso.date(),
      recipeId: RecipeId,
    }),
  },
  shoppingLists: {
    id: z.uuid(),
    fields: z.object({
      name: RequiredText(200),
      startDate: z.iso.date().nullable(),
      endDate: z.iso.date().nullable(),
    }),
  },
  shoppingListItems: {
    id: z.uuid(),
    fields: z.object({
      shoppingListId: z.uuid(),
      ingredientName: IngredientName,
      measure: Measure,
      recipeId: RecipeId.nullable(),
      isChecked: z.boolean(),
    }),
  },
  pantryItems: {
    id: z.uuid(),
    fields: z.object({
      ingredientName: IngredientName,
    }),
  },
};

export type SyncedTableName = keyof typeof Tables;

/** Set by the server only. */
const ServerFields = {
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
  changeNumber: z.number().int(),
};

/** Sent by the device with each changed row. */
const DeviceFields = {
  deleted: z.boolean().describe('true deletes the row. The server sets deletedAt.'),
  baseChangeNumber: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe('The changeNumber this device last pulled for the row, or null if it never pulled it.'),
};

/** In the order a push applies them: parents before children, so foreign keys hold. */
export const SyncedTableNames = [
  'recipes',
  'recipeIngredients',
  'mealPlanEntries',
  'shoppingLists',
  'shoppingListItems',
  'pantryItems',
] as const satisfies readonly SyncedTableName[];

// Generic over the id and field shape separately, so each table keeps its own exact type.
function pulledRow<Id extends z.ZodType, Fields extends z.ZodRawShape>(table: {
  id: Id;
  fields: z.ZodObject<Fields>;
}) {
  return z.object({ ...table.fields.shape, id: table.id, ...ServerFields });
}

function pushedRow<Id extends z.ZodType, Fields extends z.ZodRawShape>(table: {
  id: Id;
  fields: z.ZodObject<Fields>;
}) {
  return z.object({ ...table.fields.shape, id: table.id, ...DeviceFields });
}

export const PulledRowSchemas = {
  recipes: pulledRow(Tables.recipes),
  recipeIngredients: pulledRow(Tables.recipeIngredients),
  mealPlanEntries: pulledRow(Tables.mealPlanEntries),
  shoppingLists: pulledRow(Tables.shoppingLists),
  shoppingListItems: pulledRow(Tables.shoppingListItems),
  pantryItems: pulledRow(Tables.pantryItems),
};

export const PushedRowSchemas = {
  recipes: pushedRow(Tables.recipes),
  recipeIngredients: pushedRow(Tables.recipeIngredients),
  mealPlanEntries: pushedRow(Tables.mealPlanEntries),
  shoppingLists: pushedRow(Tables.shoppingLists),
  shoppingListItems: pushedRow(Tables.shoppingListItems),
  pantryItems: pushedRow(Tables.pantryItems),
};

export type PulledRow<Name extends SyncedTableName> = z.infer<(typeof PulledRowSchemas)[Name]>;
export type PushedRow<Name extends SyncedTableName> = z.infer<(typeof PushedRowSchemas)[Name]>;

/** The data fields of a row: what is stored in the table's own columns. */
export type RowFields<Name extends SyncedTableName> = z.infer<(typeof Tables)[Name]['fields']>;

export const MaxPushRows = 1000;

export const PullResponseSchema = z.object({
  cursor: z.number().int().describe('Send this as `since` next time.'),
  hasMore: z.boolean().describe('Pull again straight away with the new cursor.'),
  changes: z.object({
    recipes: z.array(PulledRowSchemas.recipes),
    recipeIngredients: z.array(PulledRowSchemas.recipeIngredients),
    mealPlanEntries: z.array(PulledRowSchemas.mealPlanEntries),
    shoppingLists: z.array(PulledRowSchemas.shoppingLists),
    shoppingListItems: z.array(PulledRowSchemas.shoppingListItems),
    pantryItems: z.array(PulledRowSchemas.pantryItems),
  }),
});

export const PushRequestSchema = z.object({
  changes: z
    .object({
      recipes: z.array(PushedRowSchemas.recipes).optional(),
      recipeIngredients: z.array(PushedRowSchemas.recipeIngredients).optional(),
      mealPlanEntries: z.array(PushedRowSchemas.mealPlanEntries).optional(),
      shoppingLists: z.array(PushedRowSchemas.shoppingLists).optional(),
      shoppingListItems: z.array(PushedRowSchemas.shoppingListItems).optional(),
      pantryItems: z.array(PushedRowSchemas.pantryItems).optional(),
    })
    .refine(
      (changes) => Object.values(changes).reduce((total, rows) => total + (rows?.length ?? 0), 0) <= MaxPushRows,
      `At most ${MaxPushRows} rows per push. Split larger pushes.`
    ),
});

export const PushResponseSchema = z.object({
  applied: z.number().int(),
  rejected: z.array(
    z.object({
      table: z.enum(SyncedTableNames),
      id: z.string(),
      reason: z.enum(['deleted_on_server']),
    })
  ),
});

export type PullResponse = z.infer<typeof PullResponseSchema>;
export type PushRequest = z.infer<typeof PushRequestSchema>;
export type PushResponse = z.infer<typeof PushResponseSchema>;
