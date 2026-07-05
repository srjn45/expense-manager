import { isValidISODate, monthOf, toISODate, todayISO } from '@/domain'

describe('date helpers (§6.6)', () => {
  it('formats a Date to YYYY-MM-DD using local fields', () => {
    expect(toISODate(new Date(2026, 6, 4))).toBe('2026-07-04') // month is 0-indexed
    expect(toISODate(new Date(2026, 0, 9))).toBe('2026-01-09') // zero-padded
  })
  it('todayISO uses the provided clock', () => {
    expect(todayISO(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
  it('validates real calendar dates and rejects impossible ones', () => {
    expect(isValidISODate('2026-07-04')).toBe(true)
    expect(isValidISODate('2024-02-29')).toBe(true) // leap year
    expect(isValidISODate('2026-02-30')).toBe(false)
    expect(isValidISODate('2026-13-01')).toBe(false)
    expect(isValidISODate('2026-7-4')).toBe(false) // not zero-padded
    expect(isValidISODate('not-a-date')).toBe(false)
  })
  it('buckets by YYYY-MM month', () => {
    expect(monthOf('2026-07-04')).toBe('2026-07')
  })
})
