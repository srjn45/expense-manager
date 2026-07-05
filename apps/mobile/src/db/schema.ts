import { sql } from 'drizzle-orm'
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Drizzle schema for the local SQLite database (master-plan §5).
 *
 * Conventions that the whole app depends on:
 *  - Money is a SIGNED integer `amount_minor` (negative = debit, positive = credit, §6.1)
 *    plus a per-entry ISO-4217 `currency`. Minor-unit precision is currency-aware — the
 *    math lives in `src/domain/money.ts`, never hardcoded ×100.
 *  - `occurred_on` is a LOCAL CALENDAR DATE as `YYYY-MM-DD` TEXT (never epoch ms) to avoid
 *    timezone off-by-one bugs (§6.6). It sorts lexicographically == chronologically.
 *  - `created_at` / `updated_at` / `deleted_at` are epoch-ms instants (real timestamps).
 *  - FKs are only enforced when `PRAGMA foreign_keys = ON` is set on the connection
 *    (see `getDatabase()` and the test harness). SQLite defaults it OFF.
 */

/** Preloaded + user categories (§5.1). Soft delete = `active = 0` (§6.4). */
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color'),
  icon: text('icon'),
  /** 1 for seeded preloaded rows (§6.5), 0 for user-created. */
  isPreloaded: integer('is_preloaded').notNull().default(0),
  /** 1 = visible in pickers, 0 = soft-deleted (§6.4). */
  active: integer('active').notNull().default(1),
  createdAt: integer('created_at').notNull(),
})

/** The expense ledger (§5.1). */
export const ledgerEntries = sqliteTable(
  'ledger_entries',
  {
    id: text('id').primaryKey(),
    /** User-facing short label (required). */
    title: text('title').notNull(),
    /** Optional longer note. */
    description: text('description'),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    /** SIGNED minor units: negative = debit (out), positive = credit (in) (§6.1). */
    amountMinor: integer('amount_minor').notNull(),
    /** ISO 4217 code, per-entry (default comes from app_settings). */
    currency: text('currency').notNull(),
    /** Local calendar date `YYYY-MM-DD` (§6.6). */
    occurredOn: text('occurred_on').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    /** Epoch ms of soft delete, NULL if live (§6.7). */
    deletedAt: integer('deleted_at'),
  },
  (table) => [
    // §5.2 indexes.
    index('idx_ledger_entries_occurred_on').on(sql`${table.occurredOn} DESC`),
    index('idx_ledger_entries_deleted_at').on(table.deletedAt),
    index('idx_ledger_entries_category_id').on(table.categoryId),
  ]
)

/**
 * Entry↔tag join (§5.1). Tags are normalised (lowercase, no spaces, §6.2). `ON DELETE
 * CASCADE` means a HARD delete of an entry (the 30-day purge, §6.7) removes its tags
 * automatically — only when `PRAGMA foreign_keys = ON`.
 */
export const entryTags = sqliteTable(
  'entry_tags',
  {
    entryId: text('entry_id')
      .notNull()
      .references(() => ledgerEntries.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.entryId, table.tag] }),
    index('idx_entry_tags_tag').on(table.tag),
  ]
)

/** Autocomplete source (§5.1): upserted with `last_used_at = now` on entry save (§6.2). */
export const tagSuggestions = sqliteTable('tag_suggestions', {
  tag: text('tag').primaryKey(),
  lastUsedAt: integer('last_used_at').notNull(),
})

/**
 * Single-row app settings (§5.1); the row always has `id = 1`. The PIN *hash* and any DB
 * encryption key live in `expo-secure-store`, NEVER in this table (only the `pin_set` flag).
 */
export const appSettings = sqliteTable('app_settings', {
  id: integer('id').primaryKey(),
  defaultCurrency: text('default_currency').notNull().default('INR'),
  pinSet: integer('pin_set').notNull().default(0),
  biometricsEnabled: integer('biometrics_enabled').notNull().default(0),
})

/** The fixed primary-key value of the single app_settings row. */
export const APP_SETTINGS_ID = 1

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type LedgerEntry = typeof ledgerEntries.$inferSelect
export type NewLedgerEntry = typeof ledgerEntries.$inferInsert
export type EntryTag = typeof entryTags.$inferSelect
export type TagSuggestion = typeof tagSuggestions.$inferSelect
export type AppSettings = typeof appSettings.$inferSelect
