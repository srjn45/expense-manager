import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'

import type * as schema from './schema'

/**
 * The injectable database type every repository accepts as its first argument.
 *
 * Both drivers we use are `'sync'`-mode `BaseSQLiteDatabase`s over the SAME schema:
 *  - production: `drizzle-orm/expo-sqlite` (ExpoSQLiteDatabase) — see `getDatabase()`.
 *  - tests:      `drizzle-orm/better-sqlite3` over an in-memory DB — see the test harness.
 * `expo-sqlite` is a native module and cannot run under Jest (§3), so repos NEVER import a
 * concrete client; they take one of these. A Drizzle transaction handle is also assignable
 * here (SQLiteTransaction extends BaseSQLiteDatabase), so the same query code runs inside
 * or outside a transaction. `TRunResult` is left `any` — repos don't depend on it and it
 * differs per driver.
 */
export type AppDatabase = BaseSQLiteDatabase<'sync', any, typeof schema>
