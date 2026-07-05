/**
 * Test-only database harness.
 *
 * `expo-sqlite` is a native module and cannot run under Jest (§3), so repo/seed tests run
 * against a REAL in-memory SQLite engine via `better-sqlite3` — same SQL dialect, no mocks.
 * The SAME generated Drizzle migrations that ship to devices are applied here, so tests also
 * verify the migration is well-formed. `PRAGMA foreign_keys = ON` mirrors `getDatabase()`.
 *
 * This is a helper, not a test file (no `.test.` suffix), so Jest does not run it directly.
 */
import path from 'node:path'

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

import * as schema from '../schema'
import type { AppDatabase } from '../types'

export type TestDatabase = {
  db: AppDatabase
  sqlite: Database.Database
  /** Close the underlying connection. */
  close: () => void
}

const MIGRATIONS_FOLDER = path.resolve(__dirname, '..', 'migrations')

/** Create a fresh in-memory database with the real migrations applied and FKs enforced. */
export function createTestDatabase(): TestDatabase {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
  return { db, sqlite, close: () => sqlite.close() }
}
