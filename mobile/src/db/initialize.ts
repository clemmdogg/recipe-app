import { Migrations } from '@/db/migrations';
import type { Database, Migration } from '@/db/types';

export const DatabaseName = 'recipes.db';

/**
 * Applies connection settings and runs pending migrations. Used as `SQLiteProvider`'s
 * `onInit`, so it finishes before any screen can query the database.
 */
export async function initializeDatabase(
  db: Database,
  migrations: readonly Migration[] = Migrations
): Promise<void> {
  assertSequentialVersions(migrations);

  // Connection settings can't be changed inside a transaction, so they run first.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if (row === null) {
    throw new Error('Could not read the database schema version');
  }

  const currentVersion = row.user_version;
  const latestVersion = migrations.length;
  if (currentVersion > latestVersion) {
    throw new Error(
      `Database schema version ${currentVersion} is newer than this app supports (${latestVersion})`
    );
  }

  const pending = migrations.filter((migration) => migration.version > currentVersion);
  if (pending.length === 0) {
    return;
  }

  // Schema changes and the version bump share one transaction, so a failure rolls back both.
  await db.withTransactionAsync(async () => {
    for (const migration of pending) {
      await db.execAsync(migration.sql);
    }
    // PRAGMA values can't be bound as parameters; latestVersion is a number from code.
    await db.execAsync(`PRAGMA user_version = ${latestVersion}`);
  });
}

function assertSequentialVersions(migrations: readonly Migration[]): void {
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new Error(
        `Migration "${migration.name}" has version ${migration.version}, expected ${index + 1}`
      );
    }
  });
}
