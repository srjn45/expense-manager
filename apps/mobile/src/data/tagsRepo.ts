/**
 * Tags repository (§6.2).
 *
 * Owns the `tag_suggestions` autocomplete table and low-level `entry_tags` writes.
 * `entriesRepo` calls `upsertTagSuggestions` / `setEntryTags` inside its own transaction on
 * every entry save. Framework-agnostic (injected {@link AppDatabase}).
 */
import { sql } from 'drizzle-orm'

import { normalizeTagList } from '@/domain'
import { now } from '@/domain/dates'
import { entryTags, tagSuggestions } from '@/db/schema'
import type { AppDatabase } from '@/db/types'
import { escapeLike } from './sqlHelpers'

/**
 * Upsert each tag into `tag_suggestions`, refreshing `last_used_at` to `atMs` (default now).
 * Tags are normalised/deduped/validated first (§6.2). Called on entry create/update.
 */
export function upsertTagSuggestions(
  db: AppDatabase,
  tags: readonly string[],
  atMs: number = now()
): void {
  const normalized = normalizeTagList(tags)
  for (const tag of normalized) {
    db.insert(tagSuggestions)
      .values({ tag, lastUsedAt: atMs })
      .onConflictDoUpdate({ target: tagSuggestions.tag, set: { lastUsedAt: atMs } })
      .run()
  }
}

/**
 * Replace the full tag set for an entry: delete existing `entry_tags` rows then insert the
 * normalised list. Does NOT touch `tag_suggestions` (callers decide when to bump usage).
 * Returns the normalised tags that were written.
 */
export function setEntryTags(db: AppDatabase, entryId: string, tags: readonly string[]): string[] {
  const normalized = normalizeTagList(tags)
  db.delete(entryTags)
    .where(sql`${entryTags.entryId} = ${entryId}`)
    .run()
  if (normalized.length > 0) {
    db.insert(entryTags)
      .values(normalized.map((tag) => ({ entryId, tag })))
      .run()
  }
  return normalized
}

export type SearchTagsOptions = {
  /** 'prefix' → `q%`, 'substring' → `%q%`. Default 'substring' (prefix matches rank first). */
  mode?: 'prefix' | 'substring'
  /** Max results. Default 10. */
  limit?: number
}

/**
 * Autocomplete search over `tag_suggestions`. Matches by prefix or substring (case-
 * insensitive), ranking prefix matches first, then most-recently-used. Empty query returns
 * the most-recently-used tags.
 */
export function searchTagSuggestions(
  db: AppDatabase,
  query: string,
  options: SearchTagsOptions = {}
): string[] {
  const { mode = 'substring', limit = 10 } = options
  const q = query.trim().toLowerCase()

  if (q === '') {
    const rows = db
      .select({ tag: tagSuggestions.tag })
      .from(tagSuggestions)
      .orderBy(sql`${tagSuggestions.lastUsedAt} DESC`)
      .limit(limit)
      .all()
    return rows.map((r) => r.tag)
  }

  const escaped = escapeLike(q)
  const pattern = mode === 'prefix' ? `${escaped}%` : `%${escaped}%`
  const prefixPattern = `${escaped}%`
  const rows = db
    .select({ tag: tagSuggestions.tag })
    .from(tagSuggestions)
    .where(sql`${tagSuggestions.tag} LIKE ${pattern} ESCAPE '\\'`)
    // Prefix matches (rank 0) before interior matches (rank 1), then most recent.
    .orderBy(
      sql`CASE WHEN ${tagSuggestions.tag} LIKE ${prefixPattern} ESCAPE '\\' THEN 0 ELSE 1 END`,
      sql`${tagSuggestions.lastUsedAt} DESC`
    )
    .limit(limit)
    .all()
  return rows.map((r) => r.tag)
}

/** Grouped export mirroring the master-plan's `tagsRepo` name. */
export const tagsRepo = {
  upsertSuggestions: upsertTagSuggestions,
  setEntryTags,
  search: searchTagSuggestions,
}
