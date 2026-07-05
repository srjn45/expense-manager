import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Phase 0 smoke table — its only job is to prove the full pipeline works end-to-end
 * (Drizzle schema → generated migration → applied on boot → read/write) on BOTH web
 * (expo-sqlite WASM) and native.
 *
 * Phase 1 replaces this with the real domain schema (categories, ledger_entries,
 * entry_tags, tag_suggestions, app_settings — §5 of the master plan). It is safe to
 * drop this table then via a new migration.
 */
export const smokeTest = sqliteTable('smoke_test', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  value: text('value').notNull(),
  createdAt: integer('created_at').notNull(),
})

export type SmokeRow = typeof smokeTest.$inferSelect
