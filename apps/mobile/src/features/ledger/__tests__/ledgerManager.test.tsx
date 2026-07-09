import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { useReducer, useState, type ReactElement } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { createCategory, createEntry, getEntry, listEntries, searchTagSuggestions } from '@/data'
import { todayISO } from '@/domain'
import { createTestDatabase, type TestDatabase } from '@/db/__tests__/testDb'

import { LedgerManager } from '../LedgerManager'

/**
 * Integration tests for Phase 4 (§8): the REAL ledger UI driven against a REAL in-memory
 * better-sqlite3 database (§3 — no DB mocks). `Harness` stands in for the route wrapper's
 * reactive read: it re-reads the windowed ledger whenever the manager reports a change
 * (`onChanged`) — exactly the mechanism that keeps the web build (where expo-sqlite's
 * change-listener is silent) live after every mutation.
 */
const PAGE_SIZE = 100

/** `Screen` reads safe-area insets, so tests provide a provider with fixed metrics. */
const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
}

function renderLedger(ui: ReactElement) {
  return render(<SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>{ui}</SafeAreaProvider>)
}

function Harness({ db }: { db: TestDatabase['db'] }) {
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const entries = listEntries(db, { limit })
  const hasMore = entries.length === limit
  return (
    <LedgerManager
      db={db}
      entries={entries}
      defaultCurrency="INR"
      hasMore={hasMore}
      onLoadMore={() => setLimit((l) => l + PAGE_SIZE)}
      onChanged={refresh}
      onOpenCategories={() => {}}
    />
  )
}

describe('LedgerManager (§8 Phase 4 — the core)', () => {
  let h: TestDatabase
  let foodId: string
  beforeEach(() => {
    h = createTestDatabase()
    foodId = createCategory(h.db, { name: 'Food', color: '#F59E0B' }).id
  })
  afterEach(() => h.close())

  it('creates a debit entry from the form and it appears live in the day-grouped list', async () => {
    const view = renderLedger(<Harness db={h.db} />)

    fireEvent.press(view.getByText('Add your first expense'))
    fireEvent.changeText(view.getByTestId('entry-title-input'), 'Lunch')
    fireEvent.changeText(view.getByTestId('entry-amount-input'), '12.50')
    fireEvent.press(view.getByTestId(`category-pick-${foodId}`))
    fireEvent.press(view.getByTestId('entry-save'))

    await waitFor(() => expect(view.getByText('Lunch')).toBeTruthy())

    const rows = listEntries(h.db)
    expect(rows).toHaveLength(1)
    // Sign derived from the default Debit toggle → negative (§6.1).
    expect(rows[0]).toMatchObject({ title: 'Lunch', amountMinor: -1250, categoryId: foodId })
    // Grouped under Today with the day total rendered.
    expect(view.getByTestId(`ledger-day-${todayISO()}`)).toBeTruthy()
    // −1250 minor units → ₹12.50 net for the day.
    expect(view.getByTestId(`ledger-day-total-${todayISO()}-INR`)).toHaveTextContent(/12\.50/)
  })

  it('derives a POSITIVE amount when the Credit toggle is chosen (no wrong-sign UI bug)', async () => {
    const view = renderLedger(<Harness db={h.db} />)

    fireEvent.press(view.getByTestId('ledger-add-fab'))
    fireEvent.changeText(view.getByTestId('entry-title-input'), 'Refund')
    fireEvent.changeText(view.getByTestId('entry-amount-input'), '5')
    fireEvent.press(view.getByTestId('entry-type-credit'))
    fireEvent.press(view.getByTestId(`category-pick-${foodId}`))
    fireEvent.press(view.getByTestId('entry-save'))

    await waitFor(() => expect(view.getByText('Refund')).toBeTruthy())
    expect(listEntries(h.db)[0].amountMinor).toBe(500)
  })

  it('edits an entry and the change is reflected live', async () => {
    const e = createEntry(h.db, {
      title: 'Old title',
      categoryId: foodId,
      amountMinor: -1200,
      currency: 'INR',
      occurredOn: todayISO(),
      tags: [],
    })
    const view = renderLedger(<Harness db={h.db} />)

    fireEvent.press(view.getByTestId(`ledger-row-${e.id}`))
    fireEvent.changeText(view.getByTestId('entry-title-input'), 'New title')
    fireEvent.press(view.getByTestId('entry-save'))

    await waitFor(() => expect(view.getByText('New title')).toBeTruthy())
    expect(view.queryByText('Old title')).toBeNull()
    expect(getEntry(h.db, e.id)?.title).toBe('New title')
  })

  it('deletes an entry (it disappears) and Undo restores it live (§6.7)', async () => {
    const e = createEntry(h.db, {
      title: 'Groceries',
      categoryId: foodId,
      amountMinor: -3000,
      currency: 'INR',
      occurredOn: todayISO(),
      tags: [],
    })
    const view = renderLedger(<Harness db={h.db} />)

    fireEvent.press(view.getByTestId(`ledger-actions-toggle-${e.id}`))
    fireEvent.press(view.getByTestId(`ledger-delete-${e.id}`))

    // Gone from the list; the Undo snackbar is shown.
    await waitFor(() => expect(view.queryByText('Groceries')).toBeNull())
    expect(listEntries(h.db)).toHaveLength(0)
    expect(getEntry(h.db, e.id)?.deletedAt).not.toBeNull()
    expect(view.getByTestId('ledger-snackbar')).toBeTruthy()

    fireEvent.press(view.getByTestId('ledger-snackbar-action'))

    await waitFor(() => expect(view.getByText('Groceries')).toBeTruthy())
    expect(getEntry(h.db, e.id)?.deletedAt).toBeNull()
    expect(listEntries(h.db)).toHaveLength(1)
  })

  it("duplicates an entry to today's date, keeping the other fields", async () => {
    const e = createEntry(h.db, {
      title: 'Coffee',
      categoryId: foodId,
      amountMinor: -15000,
      currency: 'INR',
      occurredOn: '2026-01-15',
      tags: ['cafe'],
    })
    const view = renderLedger(<Harness db={h.db} />)

    fireEvent.press(view.getByTestId(`ledger-actions-toggle-${e.id}`))
    fireEvent.press(view.getByTestId(`ledger-duplicate-${e.id}`))

    await waitFor(() => expect(listEntries(h.db)).toHaveLength(2))
    const dup = listEntries(h.db).find((x) => x.id !== e.id)!
    expect(dup).toMatchObject({
      title: 'Coffee',
      amountMinor: -15000,
      categoryId: foodId,
      occurredOn: todayISO(),
    })
    expect(dup.tags).toEqual(['cafe'])
    // The clone shows under Today.
    expect(view.getByTestId(`ledger-day-${todayISO()}`)).toBeTruthy()
  })

  it('upserts tag suggestions when an entry is saved with tags (§6.2)', async () => {
    const view = renderLedger(<Harness db={h.db} />)

    fireEvent.press(view.getByTestId('ledger-add-fab'))
    fireEvent.changeText(view.getByTestId('entry-title-input'), 'Latte')
    fireEvent.changeText(view.getByTestId('entry-amount-input'), '4')
    fireEvent.press(view.getByTestId(`category-pick-${foodId}`))

    // Reveal the "More" section, type a tag and commit it.
    fireEvent.press(view.getByTestId('entry-more-toggle'))
    fireEvent.changeText(view.getByTestId('tag-text-input'), 'espresso')
    fireEvent(view.getByTestId('tag-text-input'), 'submitEditing')
    expect(view.getByTestId('tag-chip-espresso')).toBeTruthy()

    fireEvent.press(view.getByTestId('entry-save'))

    await waitFor(() => expect(view.getByText('Latte')).toBeTruthy())
    expect(searchTagSuggestions(h.db, 'esp')).toContain('espresso')
    expect(listEntries(h.db)[0].tags).toEqual(['espresso'])
  })

  it('blocks spaces in a tag with an inline hint (§6.2)', () => {
    const view = renderLedger(<Harness db={h.db} />)
    fireEvent.press(view.getByTestId('ledger-add-fab'))
    fireEvent.press(view.getByTestId('entry-more-toggle'))

    fireEvent.changeText(view.getByTestId('tag-text-input'), 'week end')
    expect(view.getByText(/cannot contain spaces/i)).toBeTruthy()
  })

  it('renders a correct per-day section total for multiple same-day entries', () => {
    const base = {
      categoryId: foodId,
      currency: 'INR',
      occurredOn: todayISO(),
      tags: [] as string[],
    }
    createEntry(h.db, { ...base, title: 'A', amountMinor: -100000 })
    createEntry(h.db, { ...base, title: 'B', amountMinor: -40000 })

    const view = renderLedger(<Harness db={h.db} />)
    // −100000 + −40000 minor units → −₹1,400.00 net for the day.
    expect(view.getByTestId(`ledger-day-total-${todayISO()}-INR`)).toHaveTextContent(/1,400/)
  })

  it('shows the empty state with its CTA on a fresh ledger', () => {
    const view = renderLedger(<Harness db={h.db} />)
    expect(view.getByTestId('ledger-empty')).toBeTruthy()
    expect(view.getByText('Add your first expense')).toBeTruthy()
  })
})
