import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { useReducer } from 'react'

import { createCategory, getCategoryById, listCategories } from '@/data'
import { createTestDatabase, type TestDatabase } from '@/db/__tests__/testDb'

import { CategoriesManager } from '../CategoriesManager'

/**
 * Component tests for Phase 3 add/edit/deactivate (§8). They drive the REAL UI against a
 * REAL in-memory better-sqlite3 database (§3 — no DB mocks). `Harness` stands in for the
 * route wrapper's `useLiveQuery`: it re-reads active categories whenever the manager reports
 * a change, so the list reacts to mutations exactly as it does live in the app.
 */
function Harness({ db }: { db: TestDatabase['db'] }) {
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  const categories = listCategories(db)
  return <CategoriesManager db={db} categories={categories} onChanged={refresh} />
}

describe('CategoriesManager (§7.4 / §8 Phase 3)', () => {
  let h: TestDatabase
  beforeEach(() => {
    h = createTestDatabase()
  })
  afterEach(() => h.close())

  it('adds a category and it appears in the live list', async () => {
    const view = render(<Harness db={h.db} />)

    // Empty DB → EmptyState with its CTA.
    fireEvent.press(view.getByText('Add a category'))

    fireEvent.changeText(view.getByTestId('category-name-input'), 'Coffee')
    fireEvent.press(view.getByTestId('category-color-#F59E0B'))
    fireEvent.press(view.getByTestId('category-save'))

    await waitFor(() => expect(view.getByText('Coffee')).toBeTruthy())
    const rows = listCategories(h.db)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ name: 'Coffee', color: '#F59E0B', active: 1, isPreloaded: 0 })
  })

  it('surfaces the case-insensitive duplicate error from the repo (§6.4)', async () => {
    createCategory(h.db, { name: 'Food' })
    const view = render(<Harness db={h.db} />)

    fireEvent.press(view.getByTestId('categories-add-fab'))
    fireEvent.changeText(view.getByTestId('category-name-input'), 'food')
    fireEvent.press(view.getByTestId('category-save'))

    // Stays on the editor and shows the repo's error; no duplicate row created.
    await waitFor(() => expect(view.getByText(/already exists/i)).toBeTruthy())
    expect(listCategories(h.db, { includeInactive: true })).toHaveLength(1)
  })

  it('edits an existing category (rename + recolor)', async () => {
    const cat = createCategory(h.db, { name: 'Transport', color: '#EF4444' })
    const view = render(<Harness db={h.db} />)

    fireEvent.press(view.getByTestId(`category-edit-${cat.id}`))
    fireEvent.changeText(view.getByTestId('category-name-input'), 'Commute')
    fireEvent.press(view.getByTestId('category-color-#3B82F6'))
    fireEvent.press(view.getByTestId('category-save'))

    await waitFor(() => expect(view.getByText('Commute')).toBeTruthy())
    const updated = getCategoryById(h.db, cat.id)
    expect(updated).toMatchObject({ name: 'Commute', color: '#3B82F6' })
  })

  it('deactivates behind an inline confirm; it vanishes from the list but still resolves by id', async () => {
    const cat = createCategory(h.db, { name: 'Rent' })
    const view = render(<Harness db={h.db} />)

    // First tap only reveals the confirm — nothing is deactivated yet.
    fireEvent.press(view.getByTestId(`category-deactivate-${cat.id}`))
    expect(getCategoryById(h.db, cat.id)?.active).toBe(1)

    fireEvent.press(view.getByTestId(`category-confirm-deactivate-${cat.id}`))

    // Gone from the active list (and thus every picker)…
    await waitFor(() => expect(view.queryByText('Rent')).toBeNull())
    expect(listCategories(h.db)).toHaveLength(0)
    // …but the row still exists and its name resolves for old entries (DoD).
    expect(getCategoryById(h.db, cat.id)).toMatchObject({ name: 'Rent', active: 0 })
  })

  it('can cancel a pending deactivate', () => {
    const cat = createCategory(h.db, { name: 'Health' })
    const view = render(<Harness db={h.db} />)

    fireEvent.press(view.getByTestId(`category-deactivate-${cat.id}`))
    fireEvent.press(view.getByText('Cancel'))

    // Back to the normal row actions; still active.
    expect(view.getByTestId(`category-edit-${cat.id}`)).toBeTruthy()
    expect(getCategoryById(h.db, cat.id)?.active).toBe(1)
  })
})
