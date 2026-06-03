import "server-only";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { Database } from "./types";
import seedDatabase from "../../data/database.json";

const globalStore = globalThis as { __magsDb?: Database };

export function generateId() {
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function now() {
  return new Date().toISOString();
}

function cloneSeed(): Database {
  return JSON.parse(JSON.stringify(seedDatabase)) as Database;
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

function readJsonFile(path: string): Database {
  return JSON.parse(readFileSync(path, "utf-8")) as Database;
}

function tryPersistRuntime(db: Database) {
  const runtimePath = runtimeFilePath();
  try {
    if (!process.env.VERCEL) {
      mkdirSync(join(process.cwd(), "data"), { recursive: true });
    }
    writeFileSync(runtimePath, JSON.stringify(db, null, 2));
  } catch {
    // read-only or ephemeral FS — in-memory cache still works for this request
  }
}

export function loadDatabase(): Database {
  if (globalStore.__magsDb) return globalStore.__magsDb;

  const runtimePath = runtimeFilePath();
  const seedPath = dataFilePath();

  if (existsSync(runtimePath)) {
    globalStore.__magsDb = readJsonFile(runtimePath);
    return globalStore.__magsDb;
  }

  if (existsSync(seedPath)) {
    globalStore.__magsDb = readJsonFile(seedPath);
    tryPersistRuntime(globalStore.__magsDb);
    return globalStore.__magsDb;
  }

  // Vercel/serverless: bundled JSON when data/ is not on disk
  globalStore.__magsDb = cloneSeed();
  tryPersistRuntime(globalStore.__magsDb);
  return globalStore.__magsDb;
}

export function saveDatabase(db: Database) {
  globalStore.__magsDb = db;
  tryPersistRuntime(db);
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
