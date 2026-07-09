import { todayISO } from '@/domain'
import type { EntryWithTags } from '@/data'

import {
  duplicateEntryInput,
  emptyFormValues,
  entryToFormValues,
  formToEntryInput,
  type EntryFormValues,
} from '../entryForm'

function values(over: Partial<EntryFormValues> = {}): EntryFormValues {
  return {
    title: 'Lunch',
    amountText: '12.50',
    type: 'debit',
    currency: 'INR',
    categoryId: 'cat-1',
    occurredOn: '2026-07-04',
    tags: [],
    description: '',
    ...over,
  }
}

describe('formToEntryInput — sign derivation (§6.1)', () => {
  it('derives a NEGATIVE amount for a debit', () => {
    const input = formToEntryInput(values({ type: 'debit', amountText: '12.50' }))
    expect(input.amountMinor).toBe(-1250)
  })

  it('derives a POSITIVE amount for a credit', () => {
    const input = formToEntryInput(values({ type: 'credit', amountText: '12.50' }))
    expect(input.amountMinor).toBe(1250)
  })

  it('is currency-aware for minor units (JPY has 0 decimals)', () => {
    const input = formToEntryInput(values({ currency: 'JPY', amountText: '500', type: 'debit' }))
    expect(input.amountMinor).toBe(-500)
  })

  it('trims the title and maps a blank description to null', () => {
    const input = formToEntryInput(values({ title: '  Coffee  ', description: '   ' }))
    expect(input.title).toBe('Coffee')
    expect(input.description).toBeNull()
  })

  it('keeps a real description and passes tags through', () => {
    const input = formToEntryInput(values({ description: 'team lunch', tags: ['food', 'work'] }))
    expect(input.description).toBe('team lunch')
    expect(input.tags).toEqual(['food', 'work'])
  })

  it('throws on a non-positive amount rather than storing a wrong value', () => {
    expect(() => formToEntryInput(values({ amountText: '0' }))).toThrow(/greater than zero/)
    expect(() => formToEntryInput(values({ amountText: 'abc' }))).toThrow(/greater than zero/)
  })
})

describe('entryToFormValues — edit round-trip', () => {
  const entry: EntryWithTags = {
    id: 'e1',
    title: 'Refund',
    description: 'partial',
    categoryId: 'cat-9',
    amountMinor: 2599,
    currency: 'USD',
    occurredOn: '2026-06-30',
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    tags: ['store'],
  }

  it('shows the amount UNSIGNED and recovers the type from the sign', () => {
    const v = entryToFormValues(entry)
    expect(v.amountText).toBe('25.99')
    expect(v.type).toBe('credit')
    expect(v.categoryId).toBe('cat-9')
    expect(v.tags).toEqual(['store'])
    // Round-trips back to the same stored amount.
    expect(formToEntryInput(v).amountMinor).toBe(2599)
  })

  it('recovers debit from a negative stored amount', () => {
    expect(entryToFormValues({ ...entry, amountMinor: -400 }).type).toBe('debit')
  })
})

describe('duplicateEntryInput (§8 Phase 4)', () => {
  const entry: EntryWithTags = {
    id: 'e2',
    title: 'Coffee',
    description: null,
    categoryId: 'cat-3',
    amountMinor: -15000,
    currency: 'INR',
    occurredOn: '2026-01-15',
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    tags: ['cafe'],
  }

  it("clones every field but stamps TODAY's date, preserving the sign", () => {
    const input = duplicateEntryInput(entry)
    expect(input.occurredOn).toBe(todayISO())
    expect(input.amountMinor).toBe(-15000)
    expect(input.title).toBe('Coffee')
    expect(input.categoryId).toBe('cat-3')
    expect(input.tags).toEqual(['cafe'])
  })
})

describe('emptyFormValues', () => {
  it('defaults to today, debit, and the given currency', () => {
    const v = emptyFormValues('EUR')
    expect(v).toMatchObject({ type: 'debit', currency: 'EUR', occurredOn: todayISO(), tags: [] })
    expect(v.title).toBe('')
    expect(v.amountText).toBe('')
  })
})
