import { getDatabase } from './client'
import { smokeTest } from './schema'

export type SmokeResult =
  { ok: true; roundTripped: string; rowCount: number } | { ok: false; error: string }

/**
 * Phase 0 proof: write a row, read it back. Verifies the SQLite pipeline works on the
 * current platform (WASM on web, native SQLite on device). Rendered on the home screen
 * and re-runnable from there. Phase 1 removes this along with the smoke table.
 */
export async function runSmokeTest(): Promise<SmokeResult> {
  try {
    const db = getDatabase()
    const value = `hello-${Date.now()}`
    await db.insert(smokeTest).values({ value, createdAt: Date.now() })
    const rows = await db.select().from(smokeTest)
    const last = rows.at(-1)
    return { ok: true, roundTripped: last?.value ?? '', rowCount: rows.length }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
