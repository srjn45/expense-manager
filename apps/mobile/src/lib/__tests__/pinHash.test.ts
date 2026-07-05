import {
  createPinRecord,
  hashPin,
  isValidPin,
  parsePinRecord,
  PIN_MAX_LENGTH,
  PIN_MIN_LENGTH,
  serializePinRecord,
  verifyPinAgainst,
} from '@/lib/pinHash'

describe('pinHash (§8 PIN set/verify)', () => {
  describe('isValidPin', () => {
    it('accepts 4–6 digit PINs', () => {
      expect(isValidPin('1234')).toBe(true)
      expect(isValidPin('123456')).toBe(true)
      expect(isValidPin('0000')).toBe(true)
    })
    it('rejects too-short, too-long, non-digit, spaced, empty', () => {
      expect(isValidPin('123')).toBe(false)
      expect(isValidPin('1234567')).toBe(false)
      expect(isValidPin('12a4')).toBe(false)
      expect(isValidPin('12 4')).toBe(false)
      expect(isValidPin('')).toBe(false)
    })
    it('length window matches the exported constants', () => {
      expect(isValidPin('9'.repeat(PIN_MIN_LENGTH))).toBe(true)
      expect(isValidPin('9'.repeat(PIN_MAX_LENGTH))).toBe(true)
      expect(isValidPin('9'.repeat(PIN_MIN_LENGTH - 1))).toBe(false)
      expect(isValidPin('9'.repeat(PIN_MAX_LENGTH + 1))).toBe(false)
    })
  })

  it('createPinRecord throws for an invalid PIN and never stores the raw PIN', async () => {
    await expect(createPinRecord('12')).rejects.toThrow()
    const record = await createPinRecord('4321')
    const serialized = serializePinRecord(record)
    expect(serialized).not.toContain('4321')
    expect(record.hash).not.toContain('4321')
  })

  it('verifies the correct PIN and rejects an incorrect one', async () => {
    const record = await createPinRecord('1234')
    await expect(verifyPinAgainst('1234', record)).resolves.toBe(true)
    await expect(verifyPinAgainst('1235', record)).resolves.toBe(false)
    await expect(verifyPinAgainst('123456', record)).resolves.toBe(false)
  })

  it('uses a fresh random salt per record (same PIN → different hash)', async () => {
    const a = await createPinRecord('1234')
    const b = await createPinRecord('1234')
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
    // …yet both still verify against their own record.
    await expect(verifyPinAgainst('1234', a)).resolves.toBe(true)
    await expect(verifyPinAgainst('1234', b)).resolves.toBe(true)
  })

  it('hashPin is deterministic for a fixed salt', async () => {
    const h1 = await hashPin('1234', 'deadbeef')
    const h2 = await hashPin('1234', 'deadbeef')
    expect(h1).toBe(h2)
    expect(await hashPin('1234', 'cafe')).not.toBe(h1)
  })

  describe('parsePinRecord', () => {
    it('round-trips a serialized record', () => {
      const record = { v: 1, salt: 'aa', hash: 'bb' }
      expect(parsePinRecord(serializePinRecord(record))).toEqual(record)
    })
    it('returns null for absent or malformed input', () => {
      expect(parsePinRecord(null)).toBeNull()
      expect(parsePinRecord('')).toBeNull()
      expect(parsePinRecord('not json')).toBeNull()
      expect(parsePinRecord('{"v":1}')).toBeNull()
    })
  })

  it('verifyPinAgainst is safe against a malformed record', async () => {
    // @ts-expect-error deliberately malformed
    await expect(verifyPinAgainst('1234', { v: 1 })).resolves.toBe(false)
  })
})
