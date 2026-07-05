import { drizzle } from 'drizzle-orm/expo-sqlite'
import * as SQLite from 'expo-sqlite'
import { Platform } from 'react-native'

import * as schema from './schema'

/** File name of the on-device SQLite database. */
export const DATABASE_NAME = 'expense-manager.db'

/**
 * WEB WORKER WARM-UP — required for the web (WASM) build.
 *
 * expo-sqlite's web build runs SQLite in a Web Worker and makes its *synchronous* API
 * (which Drizzle's expo-sqlite driver and `useMigrations` use exclusively, via
 * `prepareSync`) appear blocking by busy-spinning on a SharedArrayBuffer. That spin is
 * capped at ~1e6 `Atomics.pause()` iterations. The FIRST sync call also triggers cold
 * worker init (compile the wa-sqlite WASM, open OPFS), which takes far longer than that
 * cap — so the first sync op throws `Sync operation timeout` and the app never boots.
 *
 * The fix is to boot the (shared, singleton) worker via the ASYNC API first. Once warm,
 * every subsequent synchronous op returns well within the cap. Verified on web
 * (headless Chromium, cross-origin isolated) — see the Phase 0 handoff. No-op on native.
 *
 * Call this once and await it BEFORE `getDatabase()` / `useMigrations` (see app/_layout).
 */
export async function warmUpDatabaseAsync(): Promise<void> {
  if (Platform.OS !== 'web') return
  // Warm a throwaway DB (not the real one) to avoid any OPFS single-writer lock contention
  // between the async warm-up handle and the synchronous connection on the same file.
  const warm = await SQLite.openDatabaseAsync('__warmup__.db')
  await warm.closeAsync()
}

let _db: DB | null = null

/**
 * The shared, typed Drizzle client (memoized). On web this MUST be called only after
 * `warmUpDatabaseAsync()` has resolved (see the note above). On native it can be called
 * any time. All Phase 1 repositories build on this.
 *
 * NOTE (Phase 1): enable `PRAGMA foreign_keys = ON` here before defining the real FKs.
 */
export function getDatabase(): DB {
  if (!_db) {
    const sqlite = SQLite.openDatabaseSync(DATABASE_NAME)
    // SQLite defaults foreign-key enforcement OFF — without this the §5 FKs (and the
    // entry_tags ON DELETE CASCADE the purge relies on) are decorative. §8 Phase 1.
    sqlite.execSync('PRAGMA foreign_keys = ON;')
    _db = drizzle(sqlite, { schema })
  }
  return _db
}

export type DB = ReturnType<typeof drizzle<typeof schema>>
