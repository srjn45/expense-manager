/**
 * Manual Jest mock for `expo-crypto` (auto-used for this node_modules package).
 *
 * `expo-crypto` is a native module and can't run under Jest, but its API is a thin wrapper
 * over standard SHA-256 + a CSPRNG. We back it with Node's real `crypto` so the PIN hashing
 * logic is exercised for real (not stubbed) — same salted-SHA-256 behavior as on-device.
 */
const nodeCrypto = require('node:crypto')

const CryptoDigestAlgorithm = {
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA384: 'SHA-384',
  SHA512: 'SHA-512',
}

const CryptoEncoding = { HEX: 'hex', BASE64: 'base64' }

const ALGO_MAP = {
  'SHA-1': 'sha1',
  'SHA-256': 'sha256',
  'SHA-384': 'sha384',
  'SHA-512': 'sha512',
}

async function digestStringAsync(algorithm, data, options) {
  const nodeAlgo = ALGO_MAP[algorithm] || 'sha256'
  const encoding = options && options.encoding === 'base64' ? 'base64' : 'hex'
  return nodeCrypto.createHash(nodeAlgo).update(String(data), 'utf8').digest(encoding)
}

function getRandomBytes(byteCount) {
  return new Uint8Array(nodeCrypto.randomBytes(byteCount))
}

async function getRandomBytesAsync(byteCount) {
  return getRandomBytes(byteCount)
}

module.exports = {
  CryptoDigestAlgorithm,
  CryptoEncoding,
  digestStringAsync,
  getRandomBytes,
  getRandomBytesAsync,
}
