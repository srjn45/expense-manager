/**
 * PIN hashing (§8 Phase 2 — App lock).
 *
 * The raw PIN NEVER leaves this module and is NEVER persisted. What we store (in
 * `expo-secure-store` on native / `localStorage` on web, via {@link ../lib/pinStorage})
 * is a SALTED SHA-256 hash of the PIN plus its random salt, serialised as JSON.
 *
 * Honest crypto note (see master-plan §1 "platform reality" + §8): a 4–6 digit PIN has at
 * most 10^6 possibilities, so this hash is a tamper/shoulder-surf deterrent, not real
 * key-stretching — brute force of the whole space is trivial for an attacker who already
 * has the stored hash. On native the hash sits behind the OS keystore (expo-secure-store);
 * on web it is in localStorage and readable via devtools, so the web lock is a
 * **convenience gate, not a security boundary**. The salt still matters: it stops the
 * stored value from being a plain rainbow-table lookup and makes each install's hash unique.
 *
 * Uses `expo-crypto` (SHA-256 + CSPRNG), which works on both native and web.
 */
import * as Crypto from 'expo-crypto'

/** Allowed PIN length window (§8: "reasonable length e.g. 4–6 digits"). */
export const PIN_MIN_LENGTH = 4
export const PIN_MAX_LENGTH = 6

/** Salt size in bytes. 16 bytes = 128 bits of uniqueness per install. */
const SALT_BYTES = 16

/** Serialisation version, so the stored format can evolve without silent breakage. */
const RECORD_VERSION = 1

/** The shape persisted by {@link ../lib/pinStorage}. Contains a hash + salt, never the PIN. */
export type PinRecord = {
  v: number
  salt: string
  hash: string
}

/** A PIN is exactly 4–6 ASCII digits. Rejects spaces, letters, empty, over-length. */
export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`).test(pin)
}

/** Hex-encode a byte array. */
function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const b of bytes) out += b.toString(16).padStart(2, '0')
  return out
}

/** Generate a fresh random salt (hex string). */
export async function generateSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(SALT_BYTES)
  return toHex(bytes)
}

/** Salted SHA-256 of a PIN. The salt is mixed in with a separator to avoid ambiguity. */
export async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`, {
    encoding: Crypto.CryptoEncoding.HEX,
  })
}

/** Build a fresh {@link PinRecord} for a new/changed PIN (new salt each time). */
export async function createPinRecord(pin: string): Promise<PinRecord> {
  if (!isValidPin(pin)) {
    throw new Error(`PIN must be ${PIN_MIN_LENGTH}–${PIN_MAX_LENGTH} digits.`)
  }
  const salt = await generateSalt()
  const hash = await hashPin(pin, salt)
  return { v: RECORD_VERSION, salt, hash }
}

/**
 * Constant-time-ish equality for two equal-length hex strings. Avoids the trivial
 * early-exit timing signal of `===`. (The PIN space is tiny anyway; this is hygiene.)
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Verify a candidate PIN against a stored record. Returns false on any malformed input. */
export async function verifyPinAgainst(pin: string, record: PinRecord): Promise<boolean> {
  if (!record || typeof record.salt !== 'string' || typeof record.hash !== 'string') return false
  const candidate = await hashPin(pin, record.salt)
  return timingSafeEqual(candidate, record.hash)
}

/** Serialise a record for storage. */
export function serializePinRecord(record: PinRecord): string {
  return JSON.stringify(record)
}

/** Parse a stored record; returns null if absent or malformed. */
export function parsePinRecord(raw: string | null | undefined): PinRecord | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PinRecord
    if (typeof parsed?.salt === 'string' && typeof parsed?.hash === 'string') return parsed
    return null
  } catch {
    return null
  }
}
