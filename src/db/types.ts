import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * The subset of expo-sqlite's database API that the data layer uses.
 * Keeping it narrow lets tests run the real SQL against Node's built-in SQLite.
 */
export type Database = Pick<
  SQLiteDatabase,
  'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync' | 'withTransactionAsync'
>;

export type Migration = {
  /** Sequential schema version, starting at 1. Never change or reuse a released version. */
  version: number;
  name: string;
  /** Trusted, static DDL. Never interpolate data into it. */
  sql: string;
};
