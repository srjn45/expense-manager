import { Platform } from 'react-native'

import {
  _setBackendForTests,
  clearStoredPin,
  hasStoredPin,
  nativeBackend,
  PIN_STORAGE_KEY,
  savePin,
  selectBackend,
  verifyPin,
  webBackend,
  type PinStorageBackend,
} from '@/lib/pinStorage'

// In-memory secure-store so the NATIVE backend can be exercised under Jest (the real native
// module can't run). Mirrors expo-secure-store's async API.
jest.mock('expo-secure-store', () => {
  const mem = new Map<string, string>()
  return {
    getItemAsync: jest.fn(async (k: string) => (mem.has(k) ? mem.get(k)! : null)),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      mem.set(k, v)
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      mem.delete(k)
    }),
  }
})

/** A minimal in-memory backend for exercising the PIN service without any platform module. */
function createMemoryBackend(): PinStorageBackend {
  let value: string | null = null
  return {
    getItem: async () => value,
    setItem: async (v) => {
      value = v
    },
    removeItem: async () => {
      value = null
    },
  }
}

describe('pinStorage — backend selection (§8 native vs web)', () => {
  it('selects localStorage on web and secure-store on native', () => {
    expect(selectBackend('web')).toBe(webBackend)
    expect(selectBackend('ios')).toBe(nativeBackend)
    expect(selectBackend('android')).toBe(nativeBackend)
  })

  it('the default backend follows Platform.OS', () => {
    // jest-expo defaults Platform.OS to a native platform; assert selection is consistent.
    expect(selectBackend(Platform.OS)).toBe(Platform.OS === 'web' ? webBackend : nativeBackend)
  })
})

describe('webBackend (localStorage)', () => {
  const store = new Map<string, string>()
  beforeAll(() => {
    ;(globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    }
  })
  afterAll(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage
  })
  beforeEach(() => store.clear())

  it('round-trips a value under the PIN key', async () => {
    expect(await webBackend.getItem()).toBeNull()
    await webBackend.setItem('hello')
    expect(store.get(PIN_STORAGE_KEY)).toBe('hello')
    expect(await webBackend.getItem()).toBe('hello')
    await webBackend.removeItem()
    expect(await webBackend.getItem()).toBeNull()
  })
})

describe('nativeBackend (expo-secure-store)', () => {
  it('round-trips a value via the secure-store async API', async () => {
    expect(await nativeBackend.getItem()).toBeNull()
    await nativeBackend.setItem('secret')
    expect(await nativeBackend.getItem()).toBe('secret')
    await nativeBackend.removeItem()
    expect(await nativeBackend.getItem()).toBeNull()
  })
})

describe('PIN service (hash + storage composed)', () => {
  let restore: () => void
  beforeEach(() => {
    restore = _setBackendForTests(createMemoryBackend())
  })
  afterEach(() => restore())

  it('reports no PIN before one is set', async () => {
    expect(await hasStoredPin()).toBe(false)
    expect(await verifyPin('1234')).toBe(false)
  })

  it('saves a PIN, then verifies correct vs incorrect', async () => {
    await savePin('1234')
    expect(await hasStoredPin()).toBe(true)
    expect(await verifyPin('1234')).toBe(true)
    expect(await verifyPin('9999')).toBe(false)
  })

  it('savePin rejects an invalid PIN', async () => {
    await expect(savePin('12')).rejects.toThrow()
    expect(await hasStoredPin()).toBe(false)
  })

  it('clearStoredPin removes the PIN', async () => {
    await savePin('4321')
    await clearStoredPin()
    expect(await hasStoredPin()).toBe(false)
    expect(await verifyPin('4321')).toBe(false)
  })

  it('changing the PIN invalidates the old one', async () => {
    await savePin('1234')
    await savePin('5678')
    expect(await verifyPin('1234')).toBe(false)
    expect(await verifyPin('5678')).toBe(true)
  })
})
