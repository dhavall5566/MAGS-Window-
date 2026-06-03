import type { Database } from "./types";
import { initialMockDatabase } from "./mock-data";

const globalMock = globalThis as { __magsMockDb?: Database };

export function generateId() {
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function now() {
  return new Date().toISOString();
}

function getStore(): Database {
  if (!globalMock.__magsMockDb) {
    globalMock.__magsMockDb = JSON.parse(
      JSON.stringify(initialMockDatabase)
    ) as Database;
  }
  return globalMock.__magsMockDb;
}

export function read<T>(fn: (db: Database) => T): T {
  return fn(getStore());
}

export function mutate<T>(fn: (db: Database) => T): T {
  return fn(getStore());
}
