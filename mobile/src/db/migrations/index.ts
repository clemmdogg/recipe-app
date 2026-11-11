import type { Migration } from '@/db/types';

import { initialMigration } from './001-initial';
import { ingredientCatalogMigration } from './002-ingredient-catalog';
import { syncMigration } from './003-sync';

/**
 * All schema migrations, in order. To change the schema, add a new numbered file
 * and append it here. Never edit a migration that has been released.
 */
export const Migrations: readonly Migration[] = [
  initialMigration,
  ingredientCatalogMigration,
  syncMigration,
];
