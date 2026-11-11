import { initialMigration } from './001-initial.ts';
import type { Migration } from './types.ts';

/** All migrations in order. Add new ones at the end; never edit one that has been run. */
export const migrations: Migration[] = [initialMigration];
