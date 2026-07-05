import { applySign } from '@/domain'
import {
  createCategory,
  createEntry,
  getEntry,
  listEntries,
  purgeDeletedEntries,
  softDeleteEntry,
  updateEntry,
} from '@/data'
import { createTestDatabase, type TestDatabase } from '@/db/__tests__/testDb'

const DAY = 24 * 60 * 60 * 1000

describe('entriesRepo', () => {
  let h: TestDatabase
  let categoryId: string
  beforeEach(() => {
    h = createTestDatabase()
    categoryId = createCategory(h.db, { name: 'Food' }).id
  })
  afterEach(() => h.close())

  const base = (over: Partial<Parameters<typeof createEntry>[1]> = {}) => ({
    title: 'Lunch',
    categoryId,
    amountMinor: -1200,
    currency: 'INR',
    occurredOn: '2026-07-04',
    tags: [] as string[],
    ...over,
  })

  it('stores a signed amount and round-trips with tags (§6.1)', () => {
    const debit = createEntry(h.db, base({ amountMinor: applySign(1200, 'debit'), tags: ['food'] }))
    expect(debit.amountMinor).toBe(-1200)
    expect(debit.tags).toEqual(['food'])

    const credit = createEntry(
      h.db,
      base({ title: 'Refund', amountMinor: applySign(500, 'credit') })
    )
    expect(credit.amountMinor).toBe(500)

    expect(getEntry(h.db, debit.id)?.tags).toEqual(['food'])
  })

  it('rejects a zero amount', () => {
    expect(() => createEntry(h.db, base({ amountMinor: 0 }))).toThrow(/zero/)
  })

  it('lists newest-first by occurred_on then created_at', () => {
    createEntry(h.db, base({ title: 'A', occurredOn: '2026-07-01' }))
    createEntry(h.db, base({ title: 'C', occurredOn: '2026-07-05' }))
    createEntry(h.db, base({ title: 'B', occurredOn: '2026-07-03' }))
    expect(listEntries(h.db).map((e) => e.title)).toEqual(['C', 'B', 'A'])
  })

  describe('tag-AND filtering (§6.3)', () => {
    beforeEach(() => {
      createEntry(h.db, base({ title: 'both', tags: ['coffee', 'work'] }))
      createEntry(h.db, base({ title: 'coffee-only', tags: ['coffee'] }))
      createEntry(h.db, base({ title: 'work-only', tags: ['work'] }))
      createEntry(h.db, base({ title: 'extra', tags: ['coffee', 'work', 'urgent'] }))
    })

    it('returns only entries that have ALL selected tags', () => {
      const titles = listEntries(h.db, { tags: ['coffee', 'work'] })
        .map((e) => e.title)
        .sort()
      expect(titles).toEqual(['both', 'extra'])
    })
    it('a single-tag filter matches any entry carrying that tag', () => {
      const titles = listEntries(h.db, { tags: ['coffee'] })
        .map((e) => e.title)
        .sort()
      expect(titles).toEqual(['both', 'coffee-only', 'extra'])
    })
    it('normalises filter tags (case-insensitive)', () => {
      expect(
        listEntries(h.db, { tags: ['COFFEE', 'Work'] })
          .map((e) => e.title)
          .sort()
      ).toEqual(['both', 'extra'])
    })
  })

  it('combines category + tags + text search with AND (§6.3)', () => {
    const other = createCategory(h.db, { name: 'Transport' }).id
    createEntry(h.db, base({ title: 'Cab home', categoryId: other, tags: ['work'] }))
    createEntry(h.db, base({ title: 'Team lunch', tags: ['work'] }))
    createEntry(h.db, base({ title: 'Solo lunch', tags: ['work'] }))

    const res = listEntries(h.db, { categoryId, tags: ['work'], search: 'lunch' })
    expect(res.map((e) => e.title).sort()).toEqual(['Solo lunch', 'Team lunch'])
  })

  it('text search escapes LIKE wildcards', () => {
    createEntry(h.db, base({ title: '50% off deal' }))
    createEntry(h.db, base({ title: 'plain' }))
    expect(listEntries(h.db, { search: '50%' }).map((e) => e.title)).toEqual(['50% off deal'])
    // A literal % must not behave as a wildcard matching everything.
    expect(listEntries(h.db, { search: '%' }).map((e) => e.title)).toEqual(['50% off deal'])
  })

  describe('soft delete (§6.7)', () => {
    it('excludes soft-deleted entries from list/filter but keeps them fetchable by id', () => {
      const e = createEntry(h.db, base({ tags: ['food'] }))
      softDeleteEntry(h.db, e.id)
      expect(listEntries(h.db)).toHaveLength(0)
      expect(listEntries(h.db, { tags: ['food'] })).toHaveLength(0)
      expect(getEntry(h.db, e.id)?.deletedAt).not.toBeNull()
    })
  })

  describe('purge (§6.7)', () => {
    it('hard-deletes only entries soft-deleted older than the 30-day cutoff, plus their tags', () => {
      const nowMs = Date.UTC(2026, 6, 31)
      const oldEntry = createEntry(h.db, base({ title: 'old', tags: ['x'] }))
      const recentEntry = createEntry(h.db, base({ title: 'recent', tags: ['y'] }))
      const liveEntry = createEntry(h.db, base({ title: 'live' }))

      softDeleteEntry(h.db, oldEntry.id, nowMs - 31 * DAY) // outside window → purged
      softDeleteEntry(h.db, recentEntry.id, nowMs - 29 * DAY) // inside window → kept

      const purged = purgeDeletedEntries(h.db, { now: nowMs, olderThanDays: 30 })
      expect(purged).toBe(1)

      // The old entry AND its entry_tags are gone; the recent (still-deleted) one survives.
      expect(getEntry(h.db, oldEntry.id)).toBeUndefined()
      expect(getEntry(h.db, recentEntry.id)).toBeDefined()
      expect(getEntry(h.db, liveEntry.id)).toBeDefined()
      // 'x' belonged only to the purged entry; a live re-add must not resurrect it.
      expect(listEntries(h.db, { tags: ['x'] })).toHaveLength(0)
    })

    it('returns 0 when nothing is old enough', () => {
      const e = createEntry(h.db, base())
      softDeleteEntry(h.db, e.id, Date.now())
      expect(purgeDeletedEntries(h.db, { olderThanDays: 30 })).toBe(0)
    })
  })

  it('updates fields and replaces the tag set', () => {
    const e = createEntry(h.db, base({ tags: ['a', 'b'] }))
    const updated = updateEntry(h.db, e.id, { title: 'Dinner', tags: ['c'] })
    expect(updated.title).toBe('Dinner')
    expect(updated.tags).toEqual(['c'])
    expect(updated.updatedAt).toBeGreaterThanOrEqual(e.updatedAt)
  })

  it('an update that omits tags leaves the existing tags untouched', () => {
    const e = createEntry(h.db, base({ tags: ['a', 'b'] }))
    const updated = updateEntry(h.db, e.id, { title: 'Dinner' })
    // The schema default must NOT clobber tags when the caller did not pass them.
    expect(updated.tags).toEqual(['a', 'b'])
  })

  it('throws when updating a non-existent entry', () => {
    expect(() => updateEntry(h.db, 'nope', { title: 'x' })).toThrow(/not found/)
  })
})
