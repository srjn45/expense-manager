import { createCategory, createEntry, searchTagSuggestions, upsertTagSuggestions } from '@/data'
import { tagSuggestions } from '@/db/schema'
import { createTestDatabase, type TestDatabase } from '@/db/__tests__/testDb'

describe('tagsRepo (§6.2)', () => {
  let h: TestDatabase
  beforeEach(() => {
    h = createTestDatabase()
  })
  afterEach(() => h.close())

  it('creating an entry upserts its tags into suggestions', () => {
    const categoryId = createCategory(h.db, { name: 'Food' }).id
    createEntry(h.db, {
      title: 'Lunch',
      categoryId,
      amountMinor: -100,
      currency: 'INR',
      occurredOn: '2026-07-04',
      tags: ['Coffee', 'work'],
    })
    const rows = h.db.select().from(tagSuggestions).all()
    expect(rows.map((r) => r.tag).sort()).toEqual(['coffee', 'work'])
  })

  it('upsert refreshes last_used_at, never duplicating the primary key', () => {
    upsertTagSuggestions(h.db, ['coffee'], 1000)
    upsertTagSuggestions(h.db, ['coffee'], 2000)
    const rows = h.db.select().from(tagSuggestions).all()
    expect(rows).toHaveLength(1)
    expect(rows[0].lastUsedAt).toBe(2000)
  })

  it('search ranks prefix matches first, then most-recently-used', () => {
    upsertTagSuggestions(h.db, ['coffee'], 100)
    upsertTagSuggestions(h.db, ['decaf-coffee'], 500) // substring match, most recent
    upsertTagSuggestions(h.db, ['commute'], 200)

    // 'coffee' + 'commute' are prefix matches (rank first, most-recent among them wins);
    // 'decaf-coffee' is only a substring match so it sorts last despite being newest.
    expect(searchTagSuggestions(h.db, 'co')).toEqual(['commute', 'coffee', 'decaf-coffee'])
    expect(searchTagSuggestions(h.db, 'coffee', { mode: 'prefix' })).toEqual(['coffee'])
  })

  it('empty query returns most-recently-used first', () => {
    upsertTagSuggestions(h.db, ['old'], 100)
    upsertTagSuggestions(h.db, ['new'], 900)
    expect(searchTagSuggestions(h.db, '')).toEqual(['new', 'old'])
  })
})
