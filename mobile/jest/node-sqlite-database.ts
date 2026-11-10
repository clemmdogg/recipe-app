/// <reference types="node" />
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import type { Database } from '@/db/types';

/**
 * A `Database` backed by Node's built-in SQLite, for tests. jest-expo mocks expo-sqlite's
 * native module, so this lets data-layer tests run their real SQL against a real database.
 */
export function createTestDatabase(): Database & { close: () => void } {
  const db = new DatabaseSync(':memory:');

  const prepare = (source: string, params: unknown[]) => {
    const statement = db.prepare(source);
    const { named, positional } = toNodeParams(params);
    if (named) {
      return {
        run: () => statement.run(named),
        get: () => statement.get(named),
        all: () => statement.all(named),
      };
    }
    return {
      run: () => statement.run(...positional),
      get: () => statement.get(...positional),
      all: () => statement.all(...positional),
    };
  };

  return {
    async execAsync(source: string) {
      db.exec(source);
    },
    async runAsync(source: string, ...params: unknown[]) {
      const result = prepare(source, params).run();
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    async getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null> {
      return (prepare(source, params).get() as T | undefined) ?? null;
    },
    async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
      return prepare(source, params).all() as T[];
    },
    async withTransactionAsync(task: () => Promise<void>) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    close: () => db.close(),
  };
}

type NodeBindParams = {
  named?: Record<string, SQLInputValue>;
  positional: SQLInputValue[];
};

/** Accepts the same parameter forms as expo-sqlite: variadic, an array, or a `$named` object. */
function toNodeParams(params: unknown[]): NodeBindParams {
  const [first] = params;
  if (params.length === 1 && Array.isArray(first)) {
    return { positional: first.map(toNodeValue) };
  }
  if (params.length === 1 && isNamedParams(first)) {
    const named: Record<string, SQLInputValue> = {};
    for (const [key, value] of Object.entries(first)) {
      named[key] = toNodeValue(value);
    }
    return { named, positional: [] };
  }
  return { positional: params.map(toNodeValue) };
}

function isNamedParams(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !ArrayBuffer.isView(value) &&
    !(value instanceof ArrayBuffer)
  );
}

function toNodeValue(value: unknown): SQLInputValue {
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (value === undefined) {
    return null;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint'
  ) {
    return value;
  }
  throw new TypeError(`Unsupported SQLite bind value: ${String(value)}`);
}
