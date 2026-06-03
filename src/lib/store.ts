import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { Database } from "./types";

const globalStore = globalThis as { __magsDb?: Database };

export function generateId() {
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function now() {
  return new Date().toISOString();
}

function dataFilePath() {
  return join(process.cwd(), "data", "database.json");
}

function runtimeFilePath() {
  if (process.env.VERCEL) {
    return "/tmp/mags-database.json";
  }
  return dataFilePath();
}

export function loadDatabase(): Database {
  if (globalStore.__magsDb) return globalStore.__magsDb;

  const seedPath = dataFilePath();
  const runtimePath = runtimeFilePath();

  let source = seedPath;
  if (process.env.VERCEL && existsSync(runtimePath)) {
    source = runtimePath;
  } else if (!process.env.VERCEL && existsSync(runtimePath)) {
    source = runtimePath;
  } else if (existsSync(seedPath)) {
    source = seedPath;
    if (process.env.VERCEL) {
      try {
        writeFileSync(runtimePath, readFileSync(seedPath, "utf-8"));
        source = runtimePath;
      } catch {
        source = seedPath;
      }
    }
  } else {
    throw new Error("Missing data/database.json — run npm run db:init");
  }

  globalStore.__magsDb = JSON.parse(readFileSync(source, "utf-8")) as Database;
  return globalStore.__magsDb;
}

export function saveDatabase(db: Database) {
  globalStore.__magsDb = db;
  const path = runtimeFilePath();
  if (!process.env.VERCEL) {
    mkdirSync(join(process.cwd(), "data"), { recursive: true });
  }
  writeFileSync(path, JSON.stringify(db, null, 2));
}

export function mutate<T>(fn: (db: Database) => T): T {
  const db = loadDatabase();
  const result = fn(db);
  saveDatabase(db);
  return result;
}

export function read<T>(fn: (db: Database) => T): T {
  return fn(loadDatabase());
}
