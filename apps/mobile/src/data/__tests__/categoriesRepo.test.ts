import {
  activeCategoriesQuery,
  createCategory,
  deactivateCategory,
  findCategoryByName,
  getCategoryById,
  listCategories,
  updateCategory,
} from '@/data'
import { createTestDatabase, type TestDatabase } from '@/db/__tests__/testDb'

describe('categoriesRepo (§6.4)', () => {
  let h: TestDatabase
  beforeEach(() => {
    h = createTestDatabase()
  })
  afterEach(() => h.close())

  it('creates a category and lists it', () => {
    const cat = createCategory(h.db, { name: 'Travel' })
    expect(cat).toMatchObject({ name: 'Travel', active: 1, isPreloaded: 0 })
    expect(listCategories(h.db).map((c) => c.name)).toEqual(['Travel'])
  })

  it('rejects a case-insensitive duplicate of an ACTIVE category', () => {
    createCategory(h.db, { name: 'Travel' })
    expect(() => createCategory(h.db, { name: 'travel' })).toThrow(/already exists/)
  })

  it('REACTIVATES an inactive match instead of duplicating, preserving the id (§6.4)', () => {
    const original = createCategory(h.db, { name: 'Travel', color: '#111111' })
    deactivateCategory(h.db, original.id)
    expect(findCategoryByName(h.db, 'travel')?.active).toBe(0)

    // Case-insensitive re-create → same row reactivated, not a second row.
    const revived = createCategory(h.db, { name: 'TRAVEL', color: '#222222' })
    expect(revived.id).toBe(original.id)
    expect(revived.active).toBe(1)
    expect(revived.name).toBe('TRAVEL')
    expect(revived.color).toBe('#222222')

    // Only one Travel row exists across all states.
    const all = listCategories(h.db, { includeInactive: true }).filter(
      (c) => c.name.toLowerCase() === 'travel'
    )
    expect(all).toHaveLength(1)
  })

  it('deactivate hides from the default list but keeps it resolvable', () => {
    const cat = createCategory(h.db, { name: 'Rent' })
    deactivateCategory(h.db, cat.id)
    expect(listCategories(h.db)).toHaveLength(0)
    expect(listCategories(h.db, { includeInactive: true })).toHaveLength(1)
    expect(findCategoryByName(h.db, 'rent')?.id).toBe(cat.id)
  })

  it('getCategoryById resolves a DEACTIVATED category by id (old-entry name display, §8 DoD)', () => {
    const cat = createCategory(h.db, { name: 'Rent' })
    deactivateCategory(h.db, cat.id)
    // A ledger entry referencing this id must still resolve its name after deactivation.
    expect(getCategoryById(h.db, cat.id)).toMatchObject({ name: 'Rent', active: 0 })
  })

  it('activeCategoriesQuery returns ACTIVE only, ordered case-insensitively (live-list source)', () => {
    createCategory(h.db, { name: 'banana' })
    createCategory(h.db, { name: 'Apple' })
    const cherry = createCategory(h.db, { name: 'Cherry' })
    deactivateCategory(h.db, cherry.id)

    const rows = activeCategoriesQuery(h.db).all()
    // Cherry is deactivated → excluded from every picker; Apple before banana (case-insensitive).
    expect(rows.map((c) => c.name)).toEqual(['Apple', 'banana'])
  })

  it('enforces case-insensitive uniqueness on rename', () => {
    createCategory(h.db, { name: 'Food' })
    const other = createCategory(h.db, { name: 'Fuel' })
    expect(() => updateCategory(h.db, other.id, { name: 'food' })).toThrow(/already exists/)
    const renamed = updateCategory(h.db, other.id, { name: 'Petrol' })
    expect(renamed.name).toBe('Petrol')
  })
})
