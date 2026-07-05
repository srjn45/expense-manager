/**
 * Ledger entries repository (§6.1, §6.3, §6.7).
 *
 * Framework-agnostic (injected {@link AppDatabase}). Owns entry CRUD, soft delete + restore
 * (Undo), the filtered ledger query, and the 30-day purge of soft-deleted rows.
 *
 * Money: `amountMinor` is stored SIGNED exactly as given (negative = debit, positive =
 * credit, §6.1) — the sign is applied by the caller/domain before it reaches here.
 * Tags: written via `tagsRepo.setEntryTags` and bumped in `tag_suggestions` on every save.
 */
import { and, eq, inArray, isNotNull, isNull, lt, sql } from 'drizzle-orm'

import { entryInputSchema, entryPatchSchema, type EntryInput, type EntryPatch } from '@/domain'
import { now } from '@/domain/dates'
import { normalizeTag } from '@/domain/tags'
import { newId } from '@/lib/id'
import { entryTags, ledgerEntries, type LedgerEntry } from '@/db/schema'
import type { AppDatabase } from '@/db/types'
import { escapeLike } from './sqlHelpers'
import { setEntryTags, upsertTagSuggestions } from './tagsRepo'

/** A ledger entry plus its (sorted) tag list — what the ledger UI renders per row. */
export type EntryWithTags = LedgerEntry & { tags: string[] }

/** Load tags for a set of entries and attach them, preserving the input order. */
function attachTags(db: AppDatabase, entries: LedgerEntry[]): EntryWithTags[] {
  if (entries.length === 0) return []
  const ids = entries.map((e) => e.id)
  const tagRows = db.select().from(entryTags).where(inArray(entryTags.entryId, ids)).all()
  const byEntry = new Map<string, string[]>()
  for (const row of tagRows) {
    const list = byEntry.get(row.entryId) ?? []
    list.push(row.tag)
    byEntry.set(row.entryId, list)
  }
  return entries.map((e) => ({ ...e, tags: (byEntry.get(e.id) ?? []).sort() }))
}

/** Fetch a single entry (regardless of soft-delete state) with its tags, or undefined. */
export function getEntry(db: AppDatabase, id: string): EntryWithTags | undefined {
  const entry = db.select().from(ledgerEntries).where(eq(ledgerEntries.id, id)).get()
  if (!entry) return undefined
  return attachTags(db, [entry])[0]
}

/**
 * Create a ledger entry (§6.1). Validates via `entryInputSchema` (amount must be a non-zero
 * signed integer), writes the entry, its `entry_tags`, and upserts `tag_suggestions` — all
 * in one transaction. Returns the created entry with tags.
 */
export function createEntry(db: AppDatabase, input: EntryInput): EntryWithTags {
  const data = entryInputSchema.parse(input)
  const ts = now()
  return db.transaction((tx) => {
    const entry = tx
      .insert(ledgerEntries)
      .values({
        id: newId(),
        title: data.title,
        description: data.description ?? null,
        categoryId: data.categoryId,
        amountMinor: data.amountMinor,
        currency: data.currency,
        occurredOn: data.occurredOn,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null,
      })
      .returning()
      .get()
    const tags = setEntryTags(tx, entry.id, data.tags)
    upsertTagSuggestions(tx, tags, ts)
    return { ...entry, tags: [...tags].sort() }
  })
}

/**
 * Update an entry (§7.3 edit). Any subset of fields; `updated_at` is refreshed. If `tags`
 * is provided, the entry's tag set is REPLACED and suggestions re-upserted. Throws if the
 * id does not exist. Returns the updated entry with tags.
 */
export function updateEntry(db: AppDatabase, id: string, patch: EntryPatch): EntryWithTags {
  const data = entryPatchSchema.parse(patch)
  const ts = now()
  return db.transaction((tx) => {
    const current = tx.select().from(ledgerEntries).where(eq(ledgerEntries.id, id)).get()
    if (!current) throw new Error(`Entry ${id} not found.`)

    tx.update(ledgerEntries)
      .set({
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.amountMinor !== undefined ? { amountMinor: data.amountMinor } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.occurredOn !== undefined ? { occurredOn: data.occurredOn } : {}),
        updatedAt: ts,
      })
      .where(eq(ledgerEntries.id, id))
      .run()

    if (data.tags !== undefined) {
      const tags = setEntryTags(tx, id, data.tags)
      upsertTagSuggestions(tx, tags, ts)
    }

    const entry = tx.select().from(ledgerEntries).where(eq(ledgerEntries.id, id)).get()!
    return attachTags(tx, [entry])[0]
  })
}

/** Soft-delete an entry (§6.7): set `deleted_at`. The delete toast's Undo calls `restoreEntry`. */
export function softDeleteEntry(db: AppDatabase, id: string, atMs: number = now()): void {
  db.update(ledgerEntries).set({ deletedAt: atMs }).where(eq(ledgerEntries.id, id)).run()
}

/** Undo a soft delete (§6.7): clear `deleted_at`. */
export function restoreEntry(db: AppDatabase, id: string): void {
  db.update(ledgerEntries).set({ deletedAt: null }).where(eq(ledgerEntries.id, id)).run()
}

/**
 * A bounded Drizzle query over the (non-deleted) ledger, ordered newest-first, returned
 * WITHOUT `.all()` so the ledger route can hand it to Drizzle's `useLiveQuery` as a reactive
 * subscription (§8 Phase 4). It selects only ids and exists purely as the change *signal* on
 * native — the screen reads the real windowed rows through {@link listEntries} (the single
 * source of truth, §4), so both targets stay correct even where the WASM change-listener is
 * silent. `limit` bounds the subscription cost (do not subscribe the whole ledger unbounded).
 */
export function ledgerLiveQuery(db: AppDatabase, limit = 200) {
  return db
    .select({ id: ledgerEntries.id })
    .from(ledgerEntries)
    .where(isNull(ledgerEntries.deletedAt))
    .orderBy(sql`${ledgerEntries.occurredOn} DESC`, sql`${ledgerEntries.createdAt} DESC`)
    .limit(limit)
}

export type ListEntriesFilters = {
  /** Restrict to one category. */
  categoryId?: string
  /** Multi-tag AND filter — an entry matches only if it has ALL of these tags (§6.3). */
  tags?: readonly string[]
  /** Free-text search over title + description (case-insensitive `LIKE`). */
  search?: string
  /** Pagination: max rows (Phase 4 guardrail — do not load the whole ledger unbounded). */
  limit?: number
  /** Pagination: rows to skip. */
  offset?: number
}

/**
 * List entries for the ledger (§6.3). Filters combine with AND across dimensions (category
 * AND tags-AND AND text search). Soft-deleted rows are ALWAYS excluded. Ordered by
 * `occurred_on DESC, created_at DESC`. Returns entries with their tags attached.
 */
export function listEntries(db: AppDatabase, filters: ListEntriesFilters = {}): EntryWithTags[] {
  const conditions = [isNull(ledgerEntries.deletedAt)]

  if (filters.categoryId) {
    conditions.push(eq(ledgerEntries.categoryId, filters.categoryId))
  }

  const search = filters.search?.trim()
  if (search) {
    const pattern = `%${escapeLike(search)}%`
    conditions.push(
      sql`(${ledgerEntries.title} LIKE ${pattern} ESCAPE '\\' OR ${ledgerEntries.description} LIKE ${pattern} ESCAPE '\\')`
    )
  }

  const filterTags = dedupeNormalized(filters.tags ?? [])
  if (filterTags.length > 0) {
    // Entries that have ALL of the requested tags: join entry_tags, keep only rows whose
    // distinct-tag count within the requested set equals the requested count (§6.3).
    const matchingIds = db
      .select({ id: entryTags.entryId })
      .from(entryTags)
      .where(inArray(entryTags.tag, filterTags))
      .groupBy(entryTags.entryId)
      .having(sql`count(distinct ${entryTags.tag}) = ${filterTags.length}`)
    conditions.push(inArray(ledgerEntries.id, matchingIds))
  }

  let query = db
    .select()
    .from(ledgerEntries)
    .where(and(...conditions))
    .orderBy(sql`${ledgerEntries.occurredOn} DESC`, sql`${ledgerEntries.createdAt} DESC`)
    .$dynamic()

  if (filters.limit !== undefined) query = query.limit(filters.limit)
  if (filters.offset !== undefined) query = query.offset(filters.offset)

  return attachTags(db, query.all())
}

export type PurgeOptions = {
  /** "Now" as epoch ms (injectable for tests). Default `Date.now()`. */
  now?: number
  /** Recovery window in days before a soft-deleted entry is hard-deleted. Default 30 (§6.7). */
  olderThanDays?: number
}

/**
 * Hard-delete entries whose `deleted_at` is older than the recovery window (§6.7), and their
 * `entry_tags`. Bounds DB growth and defines the Undo window. Call on app boot (a later
 * phase wires the call; this only exposes the routine). Returns the number of purged entries.
 */
export function purgeDeletedEntries(db: AppDatabase, options: PurgeOptions = {}): number {
  const nowMs = options.now ?? now()
  const olderThanDays = options.olderThanDays ?? 30
  const cutoff = nowMs - olderThanDays * 24 * 60 * 60 * 1000

  return db.transaction((tx) => {
    const doomed = tx
      .select({ id: ledgerEntries.id })
      .from(ledgerEntries)
      .where(and(isNotNull(ledgerEntries.deletedAt), lt(ledgerEntries.deletedAt, cutoff)))
      .all()
    if (doomed.length === 0) return 0
    const ids = doomed.map((r) => r.id)
    // Explicitly remove tags too, so the purge is correct even if FK enforcement is off.
    tx.delete(entryTags).where(inArray(entryTags.entryId, ids)).run()
    tx.delete(ledgerEntries).where(inArray(ledgerEntries.id, ids)).run()
    return doomed.length
  })
}

/** Normalise + dedupe filter tags without throwing (unlike `normalizeTagList`). */
function dedupeNormalized(tags: readonly string[]): string[] {
  const seen = new Set<string>()
  for (const raw of tags) {
    const t = normalizeTag(raw)
    if (t.length > 0) seen.add(t)
  }
  return [...seen]
}

/** Grouped export mirroring the master-plan's `entriesRepo` name. */
export const entriesRepo = {
  get: getEntry,
  create: createEntry,
  update: updateEntry,
  softDelete: softDeleteEntry,
  restore: restoreEntry,
  list: listEntries,
  liveQuery: ledgerLiveQuery,
  purgeDeleted: purgeDeletedEntries,
}
