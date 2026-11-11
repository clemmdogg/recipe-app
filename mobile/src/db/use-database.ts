import { useSQLiteContext } from 'expo-sqlite';

import type { Database } from '@/db/types';

/**
 * The open local database, for passing to repository functions.
 * The only place outside the root layout that knows the database comes from expo-sqlite,
 * so login, logout and sync can change how it is opened without touching view models.
 */
export function useDatabase(): Database {
  return useSQLiteContext();
}
