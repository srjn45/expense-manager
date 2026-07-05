import { MAX_TAGS_PER_ENTRY, normalizeTag, normalizeTagList, validateTag } from '@/domain'

describe('normalizeTag / validateTag (§6.2)', () => {
  it('trims and lowercases', () => {
    expect(normalizeTag('  Groceries ')).toBe('groceries')
    expect(validateTag('  FOOD ')).toEqual({ ok: true, tag: 'food' })
  })
  it('BLOCKS interior spaces rather than converting them', () => {
    const res = validateTag('fast food')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('has-space')
  })
  it('rejects empty and over-long tags', () => {
    expect(validateTag('   ').ok).toBe(false)
    expect(validateTag('x'.repeat(51)).ok).toBe(false)
    expect(validateTag('x'.repeat(50)).ok).toBe(true)
  })
})

describe('normalizeTagList', () => {
  it('dedupes case-insensitively and preserves order, skipping blanks', () => {
    expect(normalizeTagList(['Food', 'food', '  ', 'coffee'])).toEqual(['food', 'coffee'])
  })
  it('throws a clear message on an invalid tag', () => {
    expect(() => normalizeTagList(['ok', 'has space'])).toThrow(/spaces/)
  })
  it(`throws when exceeding ${MAX_TAGS_PER_ENTRY} tags`, () => {
    const many = Array.from({ length: MAX_TAGS_PER_ENTRY + 1 }, (_, i) => `t${i}`)
    expect(() => normalizeTagList(many)).toThrow(/at most/)
  })
})
