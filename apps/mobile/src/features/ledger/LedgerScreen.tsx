import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { router } from 'expo-router'
import { useReducer, useState } from 'react'

import { getSettings, ledgerLiveQuery, listEntries } from '@/data'
import { getDatabase } from '@/db/client'

import { LedgerManager } from './LedgerManager'

/** First page size / load-more increment (§8 Phase 4 perf guardrail: windowed, never unbounded). */
const PAGE_SIZE = 100

/**
 * Route-level ledger screen — the app's HOME (§8 Phase 4). The ONLY piece here that touches
 * expo-sqlite; it delegates all UI + mutations to the pure, DB-injected {@link LedgerManager}
 * (unit-testable under Jest).
 *
 * Reactivity (the phase's #1 risk): `useLiveQuery` is the reactive signal — on NATIVE its
 * change-listener re-renders us on every DB write. The web (WASM) build does NOT emit those
 * change events, so the manager ALSO calls `onChanged` after each in-app mutation, which bumps
 * `refresh` here (event-driven, not polling). Either signal re-renders this route; we then
 * read the current WINDOW through `listEntries` (the single source of truth, §4), so the list
 * is always fresh — live — on both targets after add / edit / delete / undo / duplicate.
 */
export function LedgerScreen() {
  const db = getDatabase()
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [, refresh] = useReducer((n: number) => n + 1, 0)

  // Native change subscription; its `.data` is intentionally ignored — we read via the repo.
  useLiveQuery(ledgerLiveQuery(db, limit))

  const entries = listEntries(db, { limit })
  const hasMore = entries.length === limit
  const defaultCurrency = getSettings(db)?.defaultCurrency ?? 'INR'

  return (
    <LedgerManager
      db={db}
      entries={entries}
      defaultCurrency={defaultCurrency}
      hasMore={hasMore}
      onLoadMore={() => setLimit((l) => l + PAGE_SIZE)}
      onChanged={refresh}
      onOpenCategories={() => router.push('/categories')}
    />
  )
}
