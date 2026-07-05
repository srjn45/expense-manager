/**
 * UUID v4 generator that works across our runtimes:
 *  - Node (Jest tests) and modern browsers expose `crypto.randomUUID`.
 *  - React Native (Hermes) may not, so we fall back to `crypto.getRandomValues`,
 *    and finally to `Math.random` (non-cryptographic — fine for local row ids).
 *
 * Row ids are opaque local identifiers only; they are never a security boundary,
 * so the weakest fallback is acceptable. Kept dependency-free and pure so the data
 * layer can generate ids without importing an Expo/native module.
 */
export function newId(): string {
  const c: Crypto | undefined = (globalThis as { crypto?: Crypto }).crypto
  if (c?.randomUUID) return c.randomUUID()

  const bytes = new Uint8Array(16)
  if (c?.getRandomValues) {
    c.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  // Set version (4) and variant (10xx) bits per RFC 4122.
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex: string[] = []
  for (let i = 0; i < 256; i++) hex.push((i + 0x100).toString(16).slice(1))
  const b = bytes
  return (
    hex[b[0]] +
    hex[b[1]] +
    hex[b[2]] +
    hex[b[3]] +
    '-' +
    hex[b[4]] +
    hex[b[5]] +
    '-' +
    hex[b[6]] +
    hex[b[7]] +
    '-' +
    hex[b[8]] +
    hex[b[9]] +
    '-' +
    hex[b[10]] +
    hex[b[11]] +
    hex[b[12]] +
    hex[b[13]] +
    hex[b[14]] +
    hex[b[15]]
  )
}
